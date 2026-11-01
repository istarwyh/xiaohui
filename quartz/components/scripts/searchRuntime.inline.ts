import { installSearchRuntime } from "../../search/browser/runtime"

installSearchRuntime(window, (reload) => fetchSearchData(reload))
