// Background service worker for Resume Tailor
// Manifest V3 requires a service worker, although most heavy lifting is handled in the popup.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Resume Tailor extension installed.");
});
