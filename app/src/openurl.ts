export function openUrl(url: string) {
  if (url.startsWith("/")) {
    url = document.URL + url.slice(1);
  }

  (window as any).webkit.messageHandlers.openURL.postMessage(url);
}
