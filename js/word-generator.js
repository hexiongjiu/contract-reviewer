// Word文档生成器核心类
class WordGenerator {
    constructor() {
        if (!window.docx) {
            throw new Error("docx库未加载，请确保docx.umd.min.js已引入");
        }
        this.docx = window.docx;
        this.currentDoc = null;  // 存储当前生成的文档对象
        this.currentPreviewHtml = null;  // 存储预览HTML
        this.currentCode = null;  // 存储代码
    }
    
    // 简单文档（只预览，不下载）
    previewSimpleDoc() {
        const { Document, Paragraph, TextRun, HeadingLevel } = this.docx;
        
        this.currentPreviewHtml = `
            <h1 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">文档标题</h1>
            <p style="line-height: 1.6; margin: 15px 0;">这是一段普通的正文内容。docx库可以轻松生成各种格式的Word文档。</p>
            <p style="line-height: 1.6; margin: 15px 0;">这是第二段内容，展示了多段落文本的生成。</p>
            <p style="margin: 15px 0;">
                <strong>这是带样式的文本：</strong> 
                <span style="color: red;">红色文本，</span>
                <em>斜体文本，</em>
                <u>下划线文本</u>
            </p>
        `;
        
        this.currentCode = `const doc = new Document({\n  sections: [{\n    children: [\n      new Paragraph({ text: "文档标题", heading: HeadingLevel.HEADING_1 }),\n      new Paragraph({ text: "正文内容..." })\n    ]\n  }]\n});`;
        
        this.currentDoc = new Document({
            creator: "示例作者",
            title: "简单文档",
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "文档标题",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        text: "这是一段普通的正文内容。docx库可以轻松生成各种格式的Word文档。",
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        text: "这是第二段内容，展示了多段落文本的生成。",
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "这是带样式的文本：", bold: true }),
                            new TextRun({ text: "红色文本，", color: "FF0000" }),
                            new TextRun({ text: "斜体文本，", italics: true }),
                            new TextRun({ text: "下划线文本", underline: {} })
                        ]
                    })
                ]
            }]
        });
        
        return {
            previewHtml: this.currentPreviewHtml,
            code: this.currentCode,
            doc: this.currentDoc
        };
    }
    
    // 富文本文档
    previewRichDoc() {
        const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = this.docx;
        
        this.currentPreviewHtml = `
            <h1 style="text-align: center; color: #667eea;">富文本格式示例</h1>
            <p style="text-align: center; margin: 20px 0;">
                <strong>加粗文本</strong> | 
                <em>斜体文本</em> | 
                <u>下划线文本</u> | 
                <span style="color: #ff6600;">彩色文本</span>
            </p>
            <p style="text-align: left;">左对齐文本</p>
            <p style="text-align: center;">居中对齐文本</p>
            <p style="text-align: right;">右对齐文本</p>
            <h3 style="margin-top: 20px;">项目符号列表：</h3>
            <p>• 第一项内容</p>
            <p>• 第二项内容</p>
            <p>• 第三项内容</p>
        `;
        
        this.currentCode = `// 支持加粗、斜体、颜色、对齐方式等丰富格式\nnew Paragraph({\n  children: [\n    new TextRun({ text: "加粗文本", bold: true }),\n    new TextRun({ text: "彩色文本", color: "FF6600" })\n  ],\n  alignment: AlignmentType.CENTER\n})`;
        
        this.currentDoc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "富文本格式示例",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "加粗文本", bold: true, size: 28 }),
                            new TextRun({ text: "  |  " }),
                            new TextRun({ text: "斜体文本", italics: true, size: 28 }),
                            new TextRun({ text: "  |  " }),
                            new TextRun({ text: "下划线文本", underline: {}, size: 28 }),
                            new TextRun({ text: "  |  " }),
                            new TextRun({ text: "彩色文本", color: "FF6600", size: 28 })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),
                    new Paragraph({ text: "左对齐文本", alignment: AlignmentType.LEFT, spacing: { after: 100 } }),
                    new Paragraph({ text: "居中对齐文本", alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                    new Paragraph({ text: "右对齐文本", alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
                    new Paragraph({ text: "项目符号列表：", heading: HeadingLevel.HEADING_3, spacing: { after: 100 } }),
                    new Paragraph({ text: "• 第一项内容", bullet: { level: 0 }, spacing: { after: 50 } }),
                    new Paragraph({ text: "• 第二项内容", bullet: { level: 0 }, spacing: { after: 50 } }),
                    new Paragraph({ text: "• 第三项内容", bullet: { level: 0 }, spacing: { after: 200 } })
                ]
            }]
        });
        
        return {
            previewHtml: this.currentPreviewHtml,
            code: this.currentCode,
            doc: this.currentDoc
        };
    }
    
    // 表格文档
    previewTableDoc() {
        const { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = this.docx;
        
        this.currentPreviewHtml = `
            <h1 style="text-align: center; color: #667eea;">员工信息表</h1>
            <p style="text-align: right; color: #999; font-size: 12px;">生成时间：${new Date().toLocaleString()}</p>
            <table class="preview-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #667eea; color: white;">
                        <th style="border: 1px solid #ddd; padding: 8px;">姓名</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">年龄</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">城市</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">职业</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;">张三</td><td style="border: 1px solid #ddd; padding: 8px;">28</td><td style="border: 1px solid #ddd; padding: 8px;">北京</td><td style="border: 1px solid #ddd; padding: 8px;">工程师</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;">李四</td><td style="border: 1px solid #ddd; padding: 8px;">32</td><td style="border: 1px solid #ddd; padding: 8px;">上海</td><td style="border: 1px solid #ddd; padding: 8px;">设计师</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;">王五</td><td style="border: 1px solid #ddd; padding: 8px;">25</td><td style="border: 1px solid #ddd; padding: 8px;">广州</td><td style="border: 1px solid #ddd; padding: 8px;">产品经理</td></tr>
                </tbody>
            </table>
            <p style="text-align: right;"><strong>总计：3 人</strong></p>
        `;
        
        this.currentCode = `// 创建表格\nconst table = new Table({\n  rows: [\n    new TableRow({ children: [\n      new TableCell({ children: [new Paragraph("姓名")] }),\n      new TableCell({ children: [new Paragraph("年龄")] })\n    ] })\n  ]\n})`;
        
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: "姓名", bold: true, alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: "年龄", bold: true, alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: "城市", bold: true, alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: "职业", bold: true, alignment: AlignmentType.CENTER })] })
                ]
            })
        ];
        
        const data = [
            ["张三", "28", "北京", "工程师"],
            ["李四", "32", "上海", "设计师"],
            ["王五", "25", "广州", "产品经理"]
        ];
        
        data.forEach(row => {
            tableRows.push(new TableRow({
                children: row.map(cell => 
                    new TableCell({ children: [new Paragraph({ text: cell, alignment: AlignmentType.CENTER })] })
                )
            }));
        });
        
        const table = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
        
        this.currentDoc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "员工信息表", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                    new Paragraph({ text: `生成时间：${new Date().toLocaleString()}`, alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
                    table,
                    new Paragraph({ text: `总计：${data.length} 人`, spacing: { before: 200 }, alignment: AlignmentType.RIGHT })
                ]
            }]
        });
        
        return {
            previewHtml: this.currentPreviewHtml,
            code: this.currentCode,
            doc: this.currentDoc
        };
    }
    
    // 报表文档
    previewReportDoc() {
        const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = this.docx;
        
        this.currentPreviewHtml = `
            <h1 style="text-align: center; color: #667eea;">2024年度销售业绩报告</h1>
            <p style="text-align: right; color: #999;">报告日期：${new Date().toLocaleDateString()}</p>
            <h2 style="color: #667eea; margin-top: 30px;">一、总体概况</h2>
            <p style="line-height: 1.6;">本年度销售业绩持续增长，四个季度均呈现上升趋势。全年总销售额达到2118万元，同比增长15.2%。</p>
            <h2 style="color: #667eea; margin-top: 30px;">二、业绩分析</h2>
            <p><strong>1.</strong> 第四季度表现最佳，销售额达594万元</p>
            <p><strong>2.</strong> 产品C连续四个季度保持领先</p>
            <h2 style="color: #667eea; margin-top: 30px;">三、结论与建议</h2>
            <p>总体来看，2024年销售业绩符合预期并略有超出。</p>
        `;
        
        this.currentCode = `// 完整的销售业绩报告\nnew Document({\n  sections: [{\n    children: [\n      new Paragraph({ text: "2024年度销售业绩报告", heading: HeadingLevel.HEADING_1 }),\n      new Paragraph({ text: "一、总体概况", heading: HeadingLevel.HEADING_2 })\n    ]\n  }]\n})`;
        
        this.currentDoc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "2024年度销售业绩报告", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                    new Paragraph({ text: `报告日期：${new Date().toLocaleDateString()}`, alignment: AlignmentType.RIGHT, spacing: { after: 300 } }),
                    new Paragraph({ text: "一、总体概况", heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                    new Paragraph({ text: "本年度销售业绩持续增长，四个季度均呈现上升趋势。全年总销售额达到2118万元，同比增长15.2%。", spacing: { after: 200 } }),
                    new Paragraph({ text: "二、业绩分析", heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: "1. ", bold: true }), new TextRun({ text: "第四季度表现最佳，销售额达594万元" })], spacing: { after: 50 } }),
                    new Paragraph({ children: [new TextRun({ text: "2. ", bold: true }), new TextRun({ text: "产品C连续四个季度保持领先" })], spacing: { after: 200 } }),
                    new Paragraph({ text: "三、结论与建议", heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                    new Paragraph({ text: "总体来看，2024年销售业绩符合预期并略有超出。", spacing: { after: 200 } })
                ]
            }]
        });
        
        return {
            previewHtml: this.currentPreviewHtml,
            code: this.currentCode,
            doc: this.currentDoc
        };
    }
    
    // 自定义文档
    previewCustomDoc(title, content) {
        const { Document, Paragraph, HeadingLevel } = this.docx;
        
        this.currentPreviewHtml = `
            <h1 style="color: #667eea;">${this.escapeHtml(title)}</h1>
            <p style="line-height: 1.6;">${this.escapeHtml(content)}</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">生成时间：${new Date().toLocaleString()}</p>
        `;
        
        this.currentCode = `// 自定义文档\nnew Document({\n  sections: [{\n    children: [\n      new Paragraph({ text: "${title}", heading: HeadingLevel.HEADING_1 }),\n      new Paragraph({ text: "${content}" })\n    ]\n  }]\n})`;
        
        this.currentDoc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: title,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        text: content,
                        spacing: { after: 100 }
                    })
                ]
            }]
        });
        
        return {
            previewHtml: this.currentPreviewHtml,
            code: this.currentCode,
            doc: this.currentDoc
        };
    }
    
    // 下载当前文档
    async downloadCurrentDoc(filename) {
        if (!this.currentDoc) {
            throw new Error("没有可下载的文档，请先点击预览按钮");
        }
        
        const { Packer } = this.docx;
        const blob = await Packer.toBlob(this.currentDoc);
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    }
    
    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}