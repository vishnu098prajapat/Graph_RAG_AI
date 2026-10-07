use pyo3::prelude::*;
use rayon::prelude::*;
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct ChunkResult {
    id: String,
    text: String,
    start_char: usize,
    end_char: usize,
}

#[derive(Serialize, Deserialize)]
struct GraphNode {
    id: String,
    text: String,
    r#type: String,
    freq: usize,
}

#[derive(Serialize, Deserialize)]
struct GraphEdge {
    source: String,
    target: String,
    weight: usize,
}

#[derive(Serialize, Deserialize)]
struct GraphResult {
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
}

#[derive(Serialize, Deserialize)]
struct SearchResult {
    index: usize,
    score: f64,
}

/// Ultra-fast text chunking in Rust using word boundaries & sliding window
#[pyfunction]
fn fast_chunk_text(text: &str, chunk_size: usize, overlap: usize) -> PyResult<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return Ok(serde_json::to_string(&Vec::<ChunkResult>::new()).unwrap());
    }

    let mut chunks = Vec::new();
    let step = if chunk_size > overlap { chunk_size - overlap } else { 1 };
    
    let mut i = 0;
    let mut chunk_idx = 0;
    while i < words.len() {
        let end = (i + chunk_size).min(words.len());
        let chunk_words = &words[i..end];
        let chunk_text = chunk_words.join(" ");

        chunks.push(ChunkResult {
            id: format!("chunk_{}", chunk_idx),
            text: chunk_text,
            start_char: i,
            end_char: end,
        });

        chunk_idx += 1;
        if end == words.len() {
            break;
        }
        i += step;
    }

    Ok(serde_json::to_string(&chunks).unwrap())
}

/// Ultra-fast parallel BM25 scoring engine in Rust
#[pyfunction]
fn fast_bm25_score(query: &str, corpus: Vec<String>, top_k: usize) -> PyResult<String> {
    let query_terms: HashSet<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    if query_terms.is_empty() || corpus.is_empty() {
        return Ok(serde_json::to_string(&Vec::<SearchResult>::new()).unwrap());
    }

    let k1 = 1.5;
    let b = 0.75;
    let avg_dl: f64 = corpus.iter().map(|doc| doc.split_whitespace().count() as f64).sum::<f64>() / corpus.len() as f64;
    let num_docs = corpus.len() as f64;

    // Calculate IDF for terms
    let mut doc_freqs: HashMap<String, usize> = HashMap::new();
    for doc in &corpus {
        let unique_terms: HashSet<String> = doc.to_lowercase().split_whitespace().map(|s| s.to_string()).collect();
        for term in unique_terms {
            if query_terms.contains(&term) {
                *doc_freqs.entry(term).or_insert(0) += 1;
            }
        }
    }

    let mut idf_map: HashMap<String, f64> = HashMap::new();
    for (term, df) in doc_freqs {
        let idf = ((num_docs - df as f64 + 0.5) / (df as f64 + 0.5) + 1.0).ln();
        idf_map.insert(term, idf.max(0.0));
    }

    // Parallel scoring using Rayon
    let mut results: Vec<SearchResult> = corpus
        .par_iter()
        .enumerate()
        .map(|(idx, doc)| {
            let words: Vec<String> = doc.to_lowercase().split_whitespace().map(|s| s.to_string()).collect();
            let doc_len = words.len() as f64;
            
            let mut tf_map: HashMap<String, f64> = HashMap::new();
            for word in words {
                if query_terms.contains(&word) {
                    *tf_map.entry(word).or_insert(0.0) += 1.0;
                }
            }

            let mut score = 0.0;
            for (term, tf) in tf_map {
                if let Some(&idf) = idf_map.get(&term) {
                    let num = tf * (k1 + 1.0);
                    let den = tf + k1 * (1.0 - b + b * (doc_len / (avg_dl + 1e-5)));
                    score += idf * (num / den);
                }
            }

            SearchResult { index: idx, score }
        })
        .filter(|res| res.score > 0.0)
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(top_k);

    Ok(serde_json::to_string(&results).unwrap())
}

/// Ultra-fast Knowledge Graph extraction in Rust
#[pyfunction]
fn fast_build_graph(chunks: Vec<String>) -> PyResult<String> {
    let tech_keywords: HashSet<&str> = [
        "API", "REST", "FastAPI", "React", "Next.js", "Python", "Rust", "C++",
        "PostgreSQL", "Database", "Vector", "Embedding", "RAG", "LLM", "Docker",
        "Kubernetes", "Cache", "Redis", "JSON", "HTTP", "HTTPS", "Server", "Client",
        "Graph", "Node", "Edge", "Algorithm", "Pipeline", "Security", "Auth", "JWT"
    ].iter().cloned().collect();

    let mut entity_freq: HashMap<String, usize> = HashMap::new();
    let mut edge_map: HashMap<(String, String), usize> = HashMap::new();

    for chunk in &chunks {
        let words: Vec<&str> = chunk.split_whitespace().collect();
        let mut seen_in_chunk: HashSet<String> = HashSet::new();

        for word in words {
            let clean = word.trim_matches(|c: char| !c.is_alphanumeric());
            if tech_keywords.contains(clean) {
                let entity = clean.to_string();
                *entity_freq.entry(entity.clone()).or_insert(0) += 1;
                seen_in_chunk.insert(entity);
            }
        }

        let chunk_entities: Vec<String> = seen_in_chunk.into_iter().collect();
        for i in 0..chunk_entities.len() {
            for j in (i + 1)..chunk_entities.len() {
                let (e1, e2) = if chunk_entities[i] < chunk_entities[j] {
                    (chunk_entities[i].clone(), chunk_entities[j].clone())
                } else {
                    (chunk_entities[j].clone(), chunk_entities[i].clone())
                };
                *edge_map.entry((e1, e2)).or_insert(0) += 1;
            }
        }
    }

    let nodes: Vec<GraphNode> = entity_freq
        .into_iter()
        .map(|(text, freq)| GraphNode {
            id: text.clone(),
            text,
            r#type: "TECH".to_string(),
            freq,
        })
        .collect();

    let edges: Vec<GraphEdge> = edge_map
        .into_iter()
        .map(|((source, target), weight)| GraphEdge { source, target, weight })
        .collect();

    let graph = GraphResult { nodes, edges };
    Ok(serde_json::to_string(&graph).unwrap())
}

#[pymodule]
fn cognigraph_rust(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(fast_chunk_text, m)?)?;
    m.add_function(wrap_pyfunction!(fast_bm25_score, m)?)?;
    m.add_function(wrap_pyfunction!(fast_build_graph, m)?)?;
    Ok(())
}
