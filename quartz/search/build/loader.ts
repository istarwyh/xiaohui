/** Initial and retried loads must use the original absolute URL after SPA navigation. */
export function searchDataScript(path: string): string {
  return `const quartzContentIndexURL = new URL(${JSON.stringify(path)}, document.baseURI).href;
const fetchData = fetch(quartzContentIndexURL).then(data => data.json());
const fetchSearchData = (reload = false) => reload
  ? fetch(quartzContentIndexURL, { cache: "reload" }).then(data => data.json())
  : fetchData;`
}
