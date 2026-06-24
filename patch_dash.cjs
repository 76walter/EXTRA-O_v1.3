const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardPanel.jsx', 'utf8');

// Add imports
content = content.replace("import { History, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';", "import { History, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, RefreshCcw, Download } from 'lucide-react';\nimport jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';");

// Add export function
const exportFunc = `  const exportPDF = async () => {
    const dashboardElement = document.getElementById('dashboard-export-area');
    if (!dashboardElement) return;
    try {
      const canvas = await html2canvas(dashboardElement, { scale: 2, backgroundColor: '#0B0F19' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(\`Relatorio_Dashboard_\${new Date().toLocaleDateString('pt-BR').replace(/\\//g, '-')}.pdf\`);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
    }
  };

  const totalOps = vendasHoje + cancelamentosHoje;`;

content = content.replace('  const totalOps = vendasHoje + cancelamentosHoje;', exportFunc);

// Wrap content with id and add button
content = content.replace('className="dashboard-wrapper"', 'className="dashboard-wrapper"\n      id="dashboard-export-area"');

const btnHtml = `<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button className="btn" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>`;

content = content.replace('<motion.div \n        variants={containerVariants}', btnHtml + '\n      <motion.div \n        variants={containerVariants}');

fs.writeFileSync('src/components/DashboardPanel.jsx', content, 'utf8');
console.log('DashboardPanel.jsx modificado com sucesso!');
