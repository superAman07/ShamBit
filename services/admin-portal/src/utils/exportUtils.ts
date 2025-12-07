import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any, filename: string) => {
  const flattenedData: any[] = [];
  
  Object.keys(data).forEach(category => {
    data[category].forEach((endpoint: any) => {
      flattenedData.push({
        Category: category,
        Method: endpoint.method,
        Path: endpoint.path,
        Description: endpoint.description,
        Auth: endpoint.auth,
        Parameters: endpoint.parameters ? endpoint.parameters.map((p: any) => `${p.name}(${p.type})`).join(', ') : ''
      });
    });
  });

  const headers = Object.keys(flattenedData[0] || {});
  const csvContent = [
    headers.join(','),
    ...flattenedData.map(row => 
      headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = (data: any, filename: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('API Endpoints Documentation', 20, 20);
  
  let yPosition = 40;
  
  Object.keys(data).forEach(category => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.text(category.toUpperCase(), 20, yPosition);
    yPosition += 10;
    
    const tableData = data[category].map((endpoint: any) => [
      endpoint.method,
      endpoint.path,
      endpoint.description,
      endpoint.auth
    ]);
    
    (doc as any).autoTable({
      head: [['Method', 'Path', 'Description', 'Auth']],
      body: tableData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportToTXT = (data: any, filename: string) => {
  let content = 'API ENDPOINTS DOCUMENTATION\n';
  content += '='.repeat(50) + '\n\n';
  
  Object.keys(data).forEach(category => {
    content += `${category.toUpperCase()}\n`;
    content += '-'.repeat(category.length) + '\n\n';
    
    data[category].forEach((endpoint: any) => {
      content += `${endpoint.method} ${endpoint.path}\n`;
      content += `Description: ${endpoint.description}\n`;
      content += `Auth: ${endpoint.auth}\n`;
      
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        content += 'Parameters:\n';
        endpoint.parameters.forEach((param: any) => {
          content += `  - ${param.name} (${param.type})${param.required ? ' *required' : ''}: ${param.description}\n`;
        });
      }
      
      content += '\n';
    });
    
    content += '\n';
  });
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};