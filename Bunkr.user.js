// ==UserScript==
// @name         Bunkr Download All Files in Folder
// @match        https://bunkr.cr/a/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bunkr.cr
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==

(function () {
    async function fetchFinalDownloadLink(filePageUrl, index, total, button) {
        try {
            updateProgressBar(button, index + 1, total);

            let response = await fetch(filePageUrl);
            let text = await response.text();

            // Parse the first HTML response to find the intermediate download link
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");

            // Get the meta tags
            const titleMeta = doc.querySelector('meta[property="og:title"]');
            const imageMeta = doc.querySelector('meta[property="og:image"]');

            // Extract content
            const title = titleMeta.getAttribute('content');
            const imageUrl = imageMeta.getAttribute('content');

            // Extract file extension from title (e.g., ".mp4")
            const extension = title.match(/\.\w+$/)[0];

            // Extract UUID from image URL (between /thumbs/ and .png)
            const uuid = imageUrl.match(/\/thumbs\/([^.]+)/)[1];

            // Extract base URL and remove "i-" prefix
            // From: https://i-nachos.bunkr.ru/thumbs/...
            // To: https://nachos.bunkr.ru
            const baseUrlMatch = imageUrl.match(/^(https?:\/\/)(i-)?([^\/]+)/);
            const protocol = baseUrlMatch[1]; // "https://"
            const domain = baseUrlMatch[3];  // "e.g., nachos.bunkr.ru"
            const baseUrl = protocol + domain;

            // Generate the final URL
            const downloadUrl = `${baseUrl}/${uuid}${extension}`;

            return downloadUrl;

            return downloadUrl ? encodeURI(downloadUrl) : null;
        } catch (error) {
            console.error("Error processing", filePageUrl, error);
            return null;
        }
    }

    function updateProgressBar(button, current, total) {
        let percentage = Math.round((current / total) * 100);
        button.innerText = `${current} of ${total}.. ${percentage}%`;
        button.style.background = `linear-gradient(to right, #263344 ${percentage}%, rgb(27, 37, 51) ${percentage}%)`;
    }

    function createModal(downloadLinks) {
        let existingModal = document.getElementById("bunkrDownloadModal");
        if (existingModal) existingModal.remove();

        let modal = document.createElement("div");
        modal.id = "bunkrDownloadModal";
        modal.style.position = "fixed";
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.backgroundColor = "rgb(var(--color-mute)";
        modal.style.padding = "20px";
        modal.style.border = "1px solid #ccc";
        modal.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
        modal.style.zIndex = "10000";
        modal.style.width = "50vw";
        modal.style.maxHeight = "70vh";
        modal.style.overflowY = "auto";
        modal.style.textAlign = "center";

        let buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "space-between";
        buttonContainer.style.marginBottom = "15px";

        let copyButton = document.createElement("button");
        copyButton.innerText = "Copy All Links";
        copyButton.className = "btn-seco-outline rounded-full px-6 font-semibold";
        copyButton.style.cursor = "pointer";
        copyButton.style.width = "180px"; // Fixed width
        copyButton.style.height = "40px"; // Fixed height

        copyButton.onclick = function () {
            navigator.clipboard.writeText(downloadLinks.join("\n")).then(() => {
                alert("Links copied to clipboard!");
            });
        };

        let closeButton = document.createElement("button");
        closeButton.innerText = "Close";
        closeButton.className = "btn-seco-outline rounded-full px-6 font-semibold";
        closeButton.style.cursor = "pointer";
        closeButton.style.width = "120px"; // Fixed width
        closeButton.style.height = "40px"; // Fixed height

        closeButton.onclick = function () {
            modal.remove();
        };

        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(closeButton);
        modal.appendChild(buttonContainer);

        // Create a grid container with 2 columns for the links
        let gridContainer = document.createElement("div");
        gridContainer.style.display = "grid";
        gridContainer.style.gridTemplateColumns = "repeat(2, 1fr)";
        gridContainer.style.gap = "2px"; // minimized gap between links
        gridContainer.style.textAlign = "left";

        downloadLinks.forEach((link) => {
            let linkDiv = document.createElement("div");
            linkDiv.style.padding = "2px"; // minimal padding
            linkDiv.style.fontSize = "85%"; // smaller font

            let linkElement = document.createElement("a");
            linkElement.href = link;
            linkElement.innerText = link;
            linkElement.style.color = "#fffff";
            linkElement.style.textDecoration = "none";
            linkElement.target = "_blank";

            // Change color when clicked or opened in a new tab
            linkElement.onclick = function () {
                linkElement.style.color = "#888888"; // Grey color when clicked
            };

            linkElement.onauxclick = function () {
                // Handles middle click (mouse wheel) and right-click > Open in New Tab
                linkElement.style.color = "#888888";
            };

            linkDiv.appendChild(linkElement);
            gridContainer.appendChild(linkDiv);
        });

        modal.appendChild(gridContainer);
        document.body.appendChild(modal);
    }

    function createGenerateLinksButton() {
        let button = document.createElement("button");
        button.innerText = "Generate Links";
        button.className = "btn-seco-outline rounded-full px-6 font-semibold flex-1 ic-download-01 ic-before before:text-lg";
        button.style.position = "fixed";
        button.style.top = "10px";
        button.style.right = "20px";
        button.style.zIndex = "1000";
        button.style.cursor = "pointer";
        button.style.textAlign = "center";
        button.style.transition = "background 0.3s";
        button.style.width = "200px"; // Fixed width
        button.style.height = "40px"; // Fixed height
        button.style.display = "flex";
        button.style.justifyContent = "center";
        button.style.alignItems = "center";
        button.style.border = "1pt solid rgb(38, 51, 68)";

        button.onclick = async function () {
            let fileLinks = document.querySelectorAll('a[aria-label="download"]');
            let totalFiles = fileLinks.length;
            let downloadLinks = [];

            if (totalFiles === 0) {
                alert("No files found.");
                return;
            }

            button.innerText = "Fetching links...";
            button.style.background = `linear-gradient(to right, #9980E5 0%, #ccc 0%)`;

            for (let i = 0; i < totalFiles; i++) {
                let filePageUrl = fileLinks[i].href;
                let finalDownloadLink = await fetchFinalDownloadLink(filePageUrl, i, totalFiles, button);
                if (finalDownloadLink) {
                    downloadLinks.push(finalDownloadLink);
                }
            }

            button.innerText = "Generate Links";
            button.style.background = "";

            if (downloadLinks.length > 0) {
                createModal(downloadLinks);
            } else {
                alert("No download links found.");
            }
        };

        document.body.appendChild(button);
    }

    createGenerateLinksButton();
})();
