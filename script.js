/* =========================================================
   GENERATOR TTE & BARCODE PEGAWAI
   script.js
   ========================================================= */

"use strict";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const employeeName = document.getElementById("employeeName");
const employeeNip = document.getElementById("employeeNip");
const employeePosition = document.getElementById("employeePosition");

const institutionSentra =
    document.getElementById("institutionSentra");

const institutionSekolahRakyat =
    document.getElementById("institutionSekolahRakyat");

const signatureCanvas =
    document.getElementById("signatureCanvas");

const clearSignatureButton =
    document.getElementById("clearSignature");

const messageElement =
    document.getElementById("message");

const generateButton =
    document.getElementById("generateButton");

const qrCodeContainer =
    document.getElementById("qrCodeContainer");

const qrLogo =
    document.getElementById("qrLogo");

const previewName =
    document.getElementById("previewName");

const previewNip =
    document.getElementById("previewNip");

const previewPosition =
    document.getElementById("previewPosition");

const previewInstitution =
    document.getElementById("previewInstitution");

const downloadPdfButton =
    document.getElementById("downloadPdfButton");


/* =========================================================
   STATE
   ========================================================= */

let signatureContext = null;

let isDrawing = false;

let hasSignatureData = false;

let lastX = 0;
let lastY = 0;

let currentQrCanvas = null;

let currentQrDataUrl = null;

let currentInstitutionLogo = null;

let qrLibraryPromise = null;

let pdfLibraryPromise = null;

let isGenerating = false;


/* =========================================================
   CONSTANTS
   ========================================================= */

const QR_LIBRARY_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

const PDF_LIBRARY_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";


/* =========================================================
   HELPER: LOAD SCRIPT
   ========================================================= */

function loadScript(src, globalCheck) {

    return new Promise((resolve, reject) => {

        if (globalCheck()) {
            resolve();
            return;
        }

        const existingScript =
            document.querySelector(`script[src="${src}"]`);

        if (existingScript) {

            existingScript.addEventListener("load", () => {

                if (globalCheck()) {
                    resolve();
                } else {
                    reject(
                        new Error("Library gagal dimuat.")
                    );
                }

            });

            existingScript.addEventListener("error", () => {

                reject(
                    new Error("Library gagal dimuat.")
                );

            });

            return;
        }


        const script =
            document.createElement("script");

        script.src = src;
        script.async = true;

        script.onload = () => {

            if (globalCheck()) {
                resolve();
            } else {
                reject(
                    new Error("Library tidak tersedia.")
                );
            }

        };

        script.onerror = () => {

            reject(
                new Error("Gagal memuat library.")
            );

        };

        document.head.appendChild(script);

    });

}


/* =========================================================
   LOAD QR LIBRARY
   ========================================================= */

function loadQrLibrary() {

    if (window.QRCode) {
        return Promise.resolve();
    }

    if (!qrLibraryPromise) {

        qrLibraryPromise =
            loadScript(
                QR_LIBRARY_URL,
                () => typeof window.QRCode !== "undefined"
            );

    }

    return qrLibraryPromise;
}


/* =========================================================
   LOAD PDF LIBRARY
   ========================================================= */

function loadPdfLibrary() {

    if (
        window.jspdf &&
        window.jspdf.jsPDF
    ) {
        return Promise.resolve();
    }

    if (!pdfLibraryPromise) {

        pdfLibraryPromise =
            loadScript(
                PDF_LIBRARY_URL,
                () =>
                    window.jspdf &&
                    typeof window.jspdf.jsPDF === "function"
            );

    }

    return pdfLibraryPromise;
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text, type = "success") {

    if (!messageElement) {
        return;
    }

    messageElement.textContent = text;

    messageElement.className =
        `message ${type}`;

}


/* =========================================================
   HIDE MESSAGE
   ========================================================= */

function hideMessage() {

    if (!messageElement) {
        return;
    }

    messageElement.textContent = "";

    messageElement.className = "message";

}


/* =========================================================
   SIGNATURE CANVAS
   ========================================================= */

function initializeSignatureCanvas() {

    if (!signatureCanvas) {
        return;
    }

    signatureContext =
        signatureCanvas.getContext("2d", {
            willReadFrequently: true
        });

    if (!signatureContext) {
        return;
    }

    resizeSignatureCanvas();

    signatureCanvas.addEventListener(
        "pointerdown",
        startDrawing
    );

    signatureCanvas.addEventListener(
        "pointermove",
        drawSignature
    );

    signatureCanvas.addEventListener(
        "pointerup",
        stopDrawing
    );

    signatureCanvas.addEventListener(
        "pointercancel",
        stopDrawing
    );

    signatureCanvas.addEventListener(
        "pointerleave",
        stopDrawing
    );

}


/* =========================================================
   RESIZE CANVAS
   ========================================================= */

function resizeSignatureCanvas() {

    if (!signatureCanvas || !signatureContext) {
        return;
    }

    const rect =
        signatureCanvas.getBoundingClientRect();

    if (
        rect.width === 0 ||
        rect.height === 0
    ) {
        return;
    }


    const oldCanvas =
        document.createElement("canvas");

    oldCanvas.width =
        signatureCanvas.width;

    oldCanvas.height =
        signatureCanvas.height;

    const oldContext =
        oldCanvas.getContext("2d");

    if (
        oldContext &&
        signatureCanvas.width > 0 &&
        signatureCanvas.height > 0
    ) {

        oldContext.drawImage(
            signatureCanvas,
            0,
            0
        );

    }


    const ratio =
        Math.max(
            1,
            Math.min(
                window.devicePixelRatio || 1,
                3
            )
        );


    signatureCanvas.width =
        Math.round(rect.width * ratio);

    signatureCanvas.height =
        Math.round(rect.height * ratio);


    signatureContext =
        signatureCanvas.getContext("2d", {
            willReadFrequently: true
        });


    signatureContext.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    signatureContext.lineWidth = 2.5;
    signatureContext.lineCap = "round";
    signatureContext.lineJoin = "round";
    signatureContext.strokeStyle = "#111827";


    if (
        oldCanvas.width > 0 &&
        oldCanvas.height > 0 &&
        hasSignatureData
    ) {

        signatureContext.drawImage(
            oldCanvas,
            0,
            0,
            oldCanvas.width,
            oldCanvas.height,
            0,
            0,
            rect.width,
            rect.height
        );

    }

}


/* =========================================================
   GET POINTER POSITION
   ========================================================= */

function getPointerPosition(event) {

    const rect =
        signatureCanvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

}


/* =========================================================
   START DRAWING
   ========================================================= */

function startDrawing(event) {

    if (!signatureCanvas || !signatureContext) {
        return;
    }

    event.preventDefault();

    isDrawing = true;

    try {
        signatureCanvas.setPointerCapture(
            event.pointerId
        );
    } catch (error) {
        // Tidak masalah jika browser tidak mendukung.
    }


    const position =
        getPointerPosition(event);

    lastX = position.x;
    lastY = position.y;


    signatureContext.beginPath();

    signatureContext.moveTo(
        lastX,
        lastY
    );

    signatureContext.lineTo(
        lastX + 0.01,
        lastY + 0.01
    );

    signatureContext.stroke();


    hasSignatureData = true;

    hideSignaturePlaceholder();

}


/* =========================================================
   DRAW SIGNATURE
   ========================================================= */

function drawSignature(event) {

    if (
        !isDrawing ||
        !signatureCanvas ||
        !signatureContext
    ) {
        return;
    }

    event.preventDefault();


    const position =
        getPointerPosition(event);


    signatureContext.beginPath();

    signatureContext.moveTo(
        lastX,
        lastY
    );

    signatureContext.lineTo(
        position.x,
        position.y
    );

    signatureContext.stroke();


    lastX = position.x;
    lastY = position.y;

    hasSignatureData = true;

    hideSignaturePlaceholder();

}


/* =========================================================
   STOP DRAWING
   ========================================================= */

function stopDrawing(event) {

    if (!isDrawing) {
        return;
    }

    isDrawing = false;

    if (
        event &&
        signatureCanvas &&
        typeof signatureCanvas.releasePointerCapture ===
            "function"
    ) {

        try {
            signatureCanvas.releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            // Tidak masalah.
        }

    }

}


/* =========================================================
   HIDE SIGNATURE PLACEHOLDER
   ========================================================= */

function hideSignaturePlaceholder() {

    const placeholder =
        document.querySelector(
            ".signature-placeholder"
        );

    if (placeholder) {
        placeholder.style.display = "none";
    }

}


/* =========================================================
   SHOW SIGNATURE PLACEHOLDER
   ========================================================= */

function showSignaturePlaceholder() {

    const placeholder =
        document.querySelector(
            ".signature-placeholder"
        );

    if (placeholder) {
        placeholder.style.display = "";
    }

}


/* =========================================================
   CLEAR SIGNATURE
   ========================================================= */

function clearSignature() {

    if (
        !signatureCanvas ||
        !signatureContext
    ) {
        return;
    }


    const rect =
        signatureCanvas.getBoundingClientRect();

    const ratio =
        Math.max(
            1,
            Math.min(
                window.devicePixelRatio || 1,
                3
            )
        );


    signatureContext.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );


    signatureContext.clearRect(
        0,
        0,
        signatureCanvas.width,
        signatureCanvas.height
    );


    signatureCanvas.width =
        Math.round(rect.width * ratio);

    signatureCanvas.height =
        Math.round(rect.height * ratio);


    signatureContext =
        signatureCanvas.getContext("2d", {
            willReadFrequently: true
        });


    signatureContext.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    signatureContext.lineWidth = 2.5;
    signatureContext.lineCap = "round";
    signatureContext.lineJoin = "round";
    signatureContext.strokeStyle = "#111827";


    hasSignatureData = false;

    showSignaturePlaceholder();

}


/* =========================================================
   CHECK SIGNATURE
   ========================================================= */

function hasSignature() {

    if (
        !signatureCanvas ||
        !signatureContext
    ) {
        return false;
    }

    if (!hasSignatureData) {
        return false;
    }


    try {

        const pixels =
            signatureContext.getImageData(
                0,
                0,
                signatureCanvas.width,
                signatureCanvas.height
            ).data;


        for (
            let i = 3;
            i < pixels.length;
            i += 4
        ) {

            if (pixels[i] > 10) {
                return true;
            }

        }

    } catch (error) {

        return hasSignatureData;

    }


    return false;

}


/* =========================================================
   GET SELECTED INSTITUTION
   ========================================================= */

function getSelectedInstitution() {

    if (
        institutionSentra &&
        institutionSentra.checked
    ) {

        return {
            value: "sentra-bahagia",

            name: 'Sentra "Bahagia" di Medan',

            logo : "assets/logo-kemensos.png"
                
        };

    }


    if (
        institutionSekolahRakyat &&
        institutionSekolahRakyat.checked
    ) {

        return {
            value: "sekolah-rakyat",

            name:
                "Sekolah Rakyat Menengah Pertama 2 Medan",

            logo: "assets/logo-sekolah-rakyat.png"
                
        };

    }


    return null;

}


/* =========================================================
   VALIDATE FORM
   ========================================================= */

function validateForm() {

    const name =
        employeeName ?
        employeeName.value.trim() :
        "";

    const nip =
        employeeNip ?
        employeeNip.value.trim() :
        "";

    const position =
        employeePosition ?
        employeePosition.value.trim() :
        "";

    const institution =
        getSelectedInstitution();


    if (!name) {

        showMessage(
            "Silakan lengkapi Nama Pegawai.",
            "error"
        );

        if (employeeName) {
            employeeName.focus();
        }

        return null;
    }


    if (!nip) {

        showMessage(
            "Silakan lengkapi NIP.",
            "error"
        );

        if (employeeNip) {
            employeeNip.focus();
        }

        return null;
    }


    if (!position) {

        showMessage(
            "Silakan lengkapi Jabatan.",
            "error"
        );

        if (employeePosition) {
            employeePosition.focus();
        }

        return null;
    }


    if (!institution) {

        showMessage(
            "Silakan pilih Instansi.",
            "error"
        );

        return null;
    }


    if (!hasSignature()) {

        showMessage(
            "Silakan buat tanda tangan pada canvas.",
            "error"
        );

        return null;
    }


    return {
        name,
        nip,
        position,
        institution
    };

}


/* =========================================================
   GENERATE UNIQUE ID
   ========================================================= */

function generateUniqueId() {

    const timestamp =
        Date.now().toString(36).toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    return `TTE-${timestamp}-${random}`;

}


/* =========================================================
   LOAD IMAGE
   ========================================================= */

function loadImage(src) {

    return new Promise((resolve, reject) => {

        const image =
            new Image();

        image.crossOrigin = "anonymous";

        image.onload = () => resolve(image);

        image.onerror = () =>
            reject(
                new Error(
                    `Logo tidak dapat dimuat: ${src}`
                )
            );

        image.src = src;

    });

}


/* =========================================================
   CREATE QR BASE
   ========================================================= */

async function createQrBase(qrText) {

    await loadQrLibrary();


    const temporaryContainer =
        document.createElement("div");

    temporaryContainer.style.position =
        "fixed";

    temporaryContainer.style.left =
        "-10000px";

    temporaryContainer.style.top =
        "-10000px";

    temporaryContainer.style.width =
        "500px";

    temporaryContainer.style.height =
        "500px";

    temporaryContainer.style.background =
        "#ffffff";

    document.body.appendChild(
        temporaryContainer
    );


    try {

        new window.QRCode(
            temporaryContainer,
            {
                text: qrText,

                width: 500,
                height: 500,

                colorDark: "#000000",
                colorLight: "#ffffff",

                correctLevel:
                    window.QRCode.CorrectLevel.H
            }
        );


        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });


        const canvas =
            temporaryContainer.querySelector(
                "canvas"
            );

        const image =
            temporaryContainer.querySelector(
                "img"
            );


        if (canvas) {

            const resultCanvas =
                document.createElement("canvas");

            resultCanvas.width = 500;
            resultCanvas.height = 500;

            const resultContext =
                resultCanvas.getContext("2d");

            resultContext.fillStyle =
                "#ffffff";

            resultContext.fillRect(
                0,
                0,
                500,
                500
            );

            resultContext.drawImage(
                canvas,
                0,
                0,
                500,
                500
            );

            return resultCanvas;

        }


        if (image) {

            await waitForImage(image);

            const resultCanvas =
                document.createElement("canvas");

            resultCanvas.width = 500;
            resultCanvas.height = 500;

            const resultContext =
                resultCanvas.getContext("2d");

            resultContext.fillStyle =
                "#ffffff";

            resultContext.fillRect(
                0,
                0,
                500,
                500
            );

            resultContext.drawImage(
                image,
                0,
                0,
                500,
                500
            );

            return resultCanvas;

        }


        throw new Error(
            "QR Code tidak berhasil dibuat."
        );

    } finally {

        temporaryContainer.remove();

    }

}


/* =========================================================
   WAIT FOR IMAGE
   ========================================================= */

function waitForImage(image) {

    return new Promise((resolve, reject) => {

        if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
        }

        image.addEventListener(
            "load",
            resolve,
            { once: true }
        );

        image.addEventListener(
            "error",
            reject,
            { once: true }
        );

    });

}


/* =========================================================
   COMPOSITE QR + LOGO
   ========================================================= */

async function createQrWithLogo(
    qrText,
    logoPath
) {

    const qrCanvas =
        await createQrBase(qrText);


    const logo =
        await loadImage(logoPath);


    const finalCanvas =
        document.createElement("canvas");

    finalCanvas.width =
        500;

    finalCanvas.height =
        500;


    const context =
        finalCanvas.getContext("2d");


    /*
     * Draw QR
     */

    context.drawImage(
        qrCanvas,
        0,
        0,
        500,
        500
    );


    /*
     * Logo area
     *
     * Sekitar 18% dari QR.
     */

    const logoSize = 88;

    const logoX =
        (500 - logoSize) / 2;

    const logoY =
        (500 - logoSize) / 2;


    /*
     * White background di belakang logo
     */

    const backgroundPadding = 9;

    context.fillStyle =
        "#ffffff";

    context.fillRect(
        logoX - backgroundPadding,
        logoY - backgroundPadding,
        logoSize + backgroundPadding * 2,
        logoSize + backgroundPadding * 2
    );


    /*
     * Border tipis
     */

    context.strokeStyle =
        "#ffffff";

    context.lineWidth = 2;

    context.strokeRect(
        logoX - backgroundPadding,
        logoY - backgroundPadding,
        logoSize + backgroundPadding * 2,
        logoSize + backgroundPadding * 2
    );


    /*
     * Draw logo
     */

    const sourceRatio =
        logo.naturalWidth /
        logo.naturalHeight;


    let drawWidth = logoSize;
    let drawHeight = logoSize;


    if (sourceRatio > 1) {
        drawHeight =
            logoSize / sourceRatio;
    } else if (sourceRatio < 1) {
        drawWidth =
            logoSize * sourceRatio;
    }


    const drawX =
        (500 - drawWidth) / 2;

    const drawY =
        (500 - drawHeight) / 2;


    context.drawImage(
        logo,
        drawX,
        drawY,
        drawWidth,
        drawHeight
    );


    return finalCanvas;

}


/* =========================================================
   CREATE QR DATA
   ========================================================= */

function createQrData(data) {

    const uniqueId =
        generateUniqueId();


    /*
     * Data dibuat ringkas supaya QR
     * tetap mudah dipindai.
     */

    const qrData = {
        type: "TTE",
        id: uniqueId,
        nama: data.name,
        nip: data.nip,
        jabatan: data.position,
        instansi: data.institution.name
    };


    return JSON.stringify(qrData);

}


/* =========================================================
   DISPLAY QR
   ========================================================= */

function displayQrCanvas(canvas) {

    if (!qrCodeContainer) {
        return;
    }


    qrCodeContainer.innerHTML = "";

    canvas.className =
        "generated-qr";


    canvas.style.display =
        "block";

    canvas.style.width =
        "100%";

    canvas.style.maxWidth =
        "310px";

    canvas.style.height =
        "auto";

    canvas.style.margin =
        "auto";


    qrCodeContainer.appendChild(
        canvas
    );

}


/* =========================================================
   GENERATE QR
   ========================================================= */

async function generateQRCode(data) {

    const qrText =
        createQrData(data);


    const finalCanvas =
        await createQrWithLogo(
            qrText,
            data.institution.logo
        );


    currentQrCanvas =
        finalCanvas;


    currentQrDataUrl =
        finalCanvas.toDataURL(
            "image/png"
        );


    currentInstitutionLogo =
        data.institution.logo;


    displayQrCanvas(
        finalCanvas
    );


    /*
     * Preview data
     */

    if (previewName) {
        previewName.textContent =
            data.name;
    }

    if (previewNip) {
        previewNip.textContent =
            data.nip;
    }

    if (previewPosition) {
        previewPosition.textContent =
            data.position;
    }

    if (previewInstitution) {
        previewInstitution.textContent =
            data.institution.name;
    }


    /*
     * Jangan menampilkan logo kedua
     * di luar QR.
     */

    if (qrLogo) {

        qrLogo.hidden = true;

        qrLogo.removeAttribute("src");

    }


    /*
     * Aktifkan tombol PDF.
     */

    if (downloadPdfButton) {
        downloadPdfButton.disabled = false;
    }


    return finalCanvas;

}


/* =========================================================
   GENERATE BUTTON
   ========================================================= */

async function handleGenerate() {

    if (isGenerating) {
        return;
    }


    const data =
        validateForm();


    if (!data) {
        return;
    }


    isGenerating = true;


    if (generateButton) {

        generateButton.disabled =
            true;

        generateButton.dataset.originalText =
            generateButton.textContent;

        generateButton.textContent =
            "Memproses...";

    }


    try {

        await generateQRCode(data);


        showMessage(
            "QR Code berhasil dibuat.",
            "success"
        );


        saveFormData();

    } catch (error) {

        console.error(
            "Generate error:",
            error
        );


        if (
            error &&
            error.message &&
            error.message.includes("Logo")
        ) {

            showMessage(
                "Logo instansi tidak dapat dimuat. Pastikan file logo berada di folder assets.",
                "error"
            );

        } else if (
            error &&
            error.message &&
            error.message.includes("QR")
        ) {

            showMessage(
                "QR Code tidak dapat dibuat. Periksa koneksi internet dan library QR.",
                "error"
            );

        } else {

            showMessage(
                "Terjadi kesalahan saat membuat QR Code.",
                "error"
            );

        }


        if (downloadPdfButton) {
            downloadPdfButton.disabled = true;
        }

    } finally {

        isGenerating = false;


        if (generateButton) {

            generateButton.disabled =
                false;

            generateButton.textContent =
                "Generate TTE & QR Code";

        }

    }

}


/* =========================================================
   CREATE PDF
   ========================================================= */

async function generatePdf() {

    if (!currentQrDataUrl) {

        showMessage(
            "Buat QR Code terlebih dahulu.",
            "warning"
        );

        return;
    }


    try {

        await loadPdfLibrary();

    } catch (error) {

        showMessage(
            "PDF tidak dapat dibuat karena library PDF gagal dimuat.",
            "error"
        );

        return;

    }


    const jsPDF =
        window.jspdf.jsPDF;


    /*
     * A4 portrait.
     * QR akan diletakkan di tengah.
     */

    const pdf =
        new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });


    /*
     * Ukuran QR.
     */

    const qrSize = 150;


    const pageWidth =
        pdf.internal.pageSize.getWidth();

    const pageHeight =
        pdf.internal.pageSize.getHeight();


    const x =
        (pageWidth - qrSize) / 2;

    const y =
        (pageHeight - qrSize) / 2;


    /*
     * PDF HANYA berisi QR.
     *
     * Logo sudah berada di tengah
     * QR pada currentQrDataUrl.
     */

    pdf.addImage(
        currentQrDataUrl,
        "PNG",
        x,
        y,
        qrSize,
        qrSize
    );


    /*
     * Nama file.
     */

    let nip =
        employeeNip ?
        employeeNip.value.trim() :
        "pegawai";


    nip =
        nip.replace(
            /[^a-zA-Z0-9_-]/g,
            ""
        );


    if (!nip) {
        nip = "pegawai";
    }


    pdf.save(
        `barcode-${nip}.pdf`
    );

}


/* =========================================================
   DOWNLOAD PDF BUTTON
   ========================================================= */

function handleDownloadPdf() {

    if (
        !currentQrCanvas ||
        !currentQrDataUrl
    ) {

        showMessage(
            "Silakan generate QR Code terlebih dahulu.",
            "warning"
        );

        return;
    }


    generatePdf();

}


/* =========================================================
   SAVE FORM DATA
   ========================================================= */

function saveFormData() {

    try {

        const selectedInstitution =
            getSelectedInstitution();


        const data = {

            name:
                employeeName ?
                employeeName.value.trim() :
                "",

            nip:
                employeeNip ?
                employeeNip.value.trim() :
                "",

            position:
                employeePosition ?
                employeePosition.value.trim() :
                "",

            institution:
                selectedInstitution ?
                selectedInstitution.value :
                ""

        };


        localStorage.setItem(
            "tteGeneratorFormData",
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "localStorage tidak tersedia."
        );

    }

}


/* =========================================================
   LOAD FORM DATA
   ========================================================= */

function loadFormData() {

    try {

        const stored =
            localStorage.getItem(
                "tteGeneratorFormData"
            );


        if (!stored) {
            return;
        }


        const data =
            JSON.parse(stored);


        if (
            employeeName &&
            typeof data.name === "string"
        ) {

            employeeName.value =
                data.name;

        }


        if (
            employeeNip &&
            typeof data.nip === "string"
        ) {

            employeeNip.value =
                data.nip;

        }


        if (
            employeePosition &&
            typeof data.position === "string"
        ) {

            employeePosition.value =
                data.position;

        }


        if (
            data.institution ===
            "sentra-bahagia" &&
            institutionSentra
        ) {

            institutionSentra.checked =
                true;

        }


        if (
            data.institution ===
            "sekolah-rakyat" &&
            institutionSekolahRakyat
        ) {

            institutionSekolahRakyat.checked =
                true;

        }

    } catch (error) {

        console.warn(
            "Data localStorage tidak dapat dibaca."
        );

    }

}


/* =========================================================
   CLEAR OLD QR
   ========================================================= */

function clearCurrentQr() {

    if (qrCodeContainer) {

        qrCodeContainer.innerHTML = `
            <div class="qr-placeholder">

                <div class="qr-placeholder-icon">
                    QR
                </div>

                <p>
                    QR Code akan muncul
                    setelah data dibuat.
                </p>

            </div>
        `;

    }


    currentQrCanvas = null;

    currentQrDataUrl = null;

    currentInstitutionLogo = null;


    if (downloadPdfButton) {
        downloadPdfButton.disabled = true;
    }

}


/* =========================================================
   FORM CHANGE
   ========================================================= */

function handleFormChange() {

    /*
     * Jika data berubah setelah QR dibuat,
     * QR lama dianggap tidak berlaku.
     */

    if (currentQrCanvas) {
        clearCurrentQr();
    }

}


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

let resizeTimer = null;

window.addEventListener(
    "resize",
    () => {

        clearTimeout(resizeTimer);

        resizeTimer =
            setTimeout(() => {

                resizeSignatureCanvas();

            }, 150);

    }
);


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

if (clearSignatureButton) {

    clearSignatureButton.addEventListener(
        "click",
        () => {

            clearSignature();

        }
    );

}


if (generateButton) {

    generateButton.addEventListener(
        "click",
        handleGenerate
    );

}


if (downloadPdfButton) {

    downloadPdfButton.addEventListener(
        "click",
        handleDownloadPdf
    );

}


if (employeeName) {

    employeeName.addEventListener(
        "input",
        handleFormChange
    );

}


if (employeeNip) {

    employeeNip.addEventListener(
        "input",
        handleFormChange
    );

}


if (employeePosition) {

    employeePosition.addEventListener(
        "input",
        handleFormChange
    );

}


if (institutionSentra) {

    institutionSentra.addEventListener(
        "change",
        handleFormChange
    );

}


if (institutionSekolahRakyat) {

    institutionSekolahRakyat.addEventListener(
        "change",
        handleFormChange
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    /*
     * Pastikan PDF disabled
     * sebelum QR dibuat.
     */

    if (downloadPdfButton) {
        downloadPdfButton.disabled = true;
    }


    /*
     * Signature canvas.
     */

    initializeSignatureCanvas();


    /*
     * Data terakhir.
     */

    loadFormData();


    /*
     * Pastikan placeholder terlihat.
     */

    if (!hasSignatureData) {
        showSignaturePlaceholder();
    }


    /*
     * Load library secara otomatis
     * di background.
     */

    loadQrLibrary().catch(error => {

        console.warn(
            "QR library belum tersedia:",
            error
        );

    });


    loadPdfLibrary().catch(error => {

        console.warn(
            "PDF library belum tersedia:",
            error
        );

    });

}


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();

}
