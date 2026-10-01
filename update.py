import re

with open('frontend/components/workbench.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update basic colors
content = content.replace('bg-[#f5f7ff]', 'bg-sky-50')
content = content.replace('border-slate-200', 'border-sky-100')
content = content.replace('linear-gradient(135deg,#ec4899,#8b5cf6)', 'linear-gradient(135deg,#38bdf8,#0ea5e9)')
content = content.replace('text-slate-600', 'text-sky-700')
content = content.replace('text-slate-700', 'text-sky-900')
content = content.replace('bg-slate-50', 'bg-sky-50')
content = content.replace('bg-slate-100', 'bg-sky-100')

# Remove GraphPanel and replace the layout
pattern = r'\{/\* ── Main layout.*?\{/\* ── Small reusable pill'
replacement = """{/* ── Main layout: PDF + Search ── */}
      <div className="flex-1 flex gap-6 p-6 min-h-0 bg-sky-50">

        {/* Left: PDF viewer */}
        <div className="flex-1 min-w-0 flex flex-col shadow-sm rounded-xl overflow-hidden" style={{ flex: 1.5 }}>
          <PdfViewer
            docId={activeDoc.id}
            jumpPage={jumpPage}
            highlights={selectedResult}
          />
        </div>

        {/* Right: Search panel */}
        <div className="flex-1 min-w-0 flex flex-col max-w-[450px]">
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
            <SearchPanel
              docs={docs}
              activeDocId={activeDoc.id}
              crossDoc={crossDoc}
              onCrossDocChange={setCrossDoc}
              selectedResult={selectedResult}
              onResultSelect={handleResultJump}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

{/* ── Small reusable pill"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/components/workbench.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
