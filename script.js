document.addEventListener("DOMContentLoaded", () => {
    const expensesContainer = document.getElementById("expensesContainer");
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    const generatePdfBtn = document.getElementById("generatePdfBtn");

    const receiptInput = document.getElementById("receiptFiles");
    const uploadReceiptsBtn = document.getElementById("uploadReceiptsBtn");
    const selectedReceiptsList = document.getElementById("selectedReceiptsList");

    // Store uploaded receipts
    let uploadedReceipts = [];

    // Add new expense row
    function addExpenseRow() {
        const tr = document.createElement("tr");
        tr.classList.add("expenseRow");
        tr.innerHTML = `
            <td><input type="date" class="expenseDate" required></td>
            <td><input type="text" class="expenseDesc" required></td>
            <td><input type="number" class="expenseAmount" step="0.01" required></td>
            <td><input type="number" class="expenseMiles" step="0.1"></td>
            <td><button type="button" class="removeExpenseBtn">Remove</button></td>
        `;
        expensesContainer.appendChild(tr);
        tr.querySelector(".removeExpenseBtn").addEventListener("click", () => tr.remove());
    }

    addExpenseBtn.addEventListener("click", addExpenseRow);

    // Upload receipts and list them
    uploadReceiptsBtn.addEventListener("click", () => {
        const files = receiptInput.files;
        if (!files.length) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/")) continue;

            uploadedReceipts.push(file);
            const li = document.createElement("li");

            li.innerHTML = `
                <span>${file.name}</span>
                <span class="uploadedTag">✅ Uploaded</span>
                <button type="button" class="removeBtn">Remove</button>
            `;

            // Remove button action
            li.querySelector(".removeBtn").addEventListener("click", () => {
                uploadedReceipts = uploadedReceipts.filter(f => f !== file);
                li.remove();
            });

            selectedReceiptsList.appendChild(li);
        }

        // Clear file input so more can be uploaded later
        receiptInput.value = "";
    });

    // Add uploaded receipt images to PDF
    async function addReceiptImages(doc) {
        if (!uploadedReceipts.length) return;

        for (let i = 0; i < uploadedReceipts.length; i++) {
            const file = uploadedReceipts[i];
            const imgData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsDataURL(file);
            });

            doc.addPage();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;

            const img = new Image();
            img.src = imgData;
            await new Promise(resolve => { img.onload = resolve; });

            const pdfWidth = pageWidth - margin * 2;
            const pdfHeight = (img.height * pdfWidth) / img.width;
            doc.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight);
        }
    }

    // Generate PDF
    generatePdfBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const firstName = document.getElementById("firstName").value || "NoName";
        const lastName = document.getElementById("lastName").value || "NoName";
        let submissionDate = document.getElementById("submissionDate").value;
        if (!submissionDate) {
            submissionDate = new Date().toISOString().split('T')[0];
        }
        const safeDate = submissionDate.replace(/[/\\?%*:|"<>]/g, "-");

        doc.setFontSize(16);
        doc.text("Reimbursement Request", 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Employee: ${firstName} ${lastName}`, 20, 35);
        doc.text(`Submission Date: ${submissionDate}`, 20, 45);

        // Collect expense rows
        const rows = [];
        let total = 0;
        document.querySelectorAll(".expenseRow").forEach(row => {
            const expenseDate = row.querySelector(".expenseDate").value;
            const desc = row.querySelector(".expenseDesc").value;
            const amount = parseFloat(row.querySelector(".expenseAmount").value) || 0;
            const miles = parseFloat(row.querySelector(".expenseMiles").value) || 0;
            const mileageAmount = miles * 0.7;
            total += amount + mileageAmount;

            rows.push([
                expenseDate,
                desc,
                amount.toFixed(2),
                miles ? miles.toFixed(1) : "-",
                mileageAmount ? mileageAmount.toFixed(2) : "-"
            ]);
        });

        // Add table with black text
        doc.autoTable({
            startY: 55,
            head: [['Date', 'Description', 'Amount ($)', 'Miles', 'Mileage $']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            bodyStyles: { textColor: [0, 0, 0] }
        });

        const finalY = doc.lastAutoTable.finalY || 55;
        doc.setFont(undefined, 'bold');
        doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, finalY + 10);
        doc.setFont(undefined, 'normal');

        await addReceiptImages(doc);

        doc.save(`${safeDate}_Reimbursement_${firstName}_${lastName}.pdf`);
    });
});
