import { QuartzComponent, QuartzComponentConstructor } from "./types"

const MatrixDebug: QuartzComponent = () => {
  return (
    <div id="matrix-debug" style={{ display: "none" }}>
      <div className="matrix-debug-panel">
        <h3>🔍 内容分析调试</h3>
        <div className="debug-section">
          <h4>检测到的编程语言:</h4>
          <div id="debug-language">-</div>
        </div>
        <div className="debug-section">
          <h4>文章主题:</h4>
          <div id="debug-topic">-</div>
        </div>
        <div className="debug-section">
          <h4>
            代码片段 (<span id="debug-snippets-count">0</span>):
          </h4>
          <div id="debug-snippets" className="debug-list"></div>
        </div>
        <div className="debug-section">
          <h4>
            技术关键词 (<span id="debug-keywords-count">0</span>):
          </h4>
          <div id="debug-keywords" className="debug-list"></div>
        </div>
        <div className="debug-section">
          <h4>上下文字符集预览:</h4>
          <div id="debug-chars" className="debug-chars"></div>
        </div>
      </div>
    </div>
  )
}

export default (() => MatrixDebug) satisfies QuartzComponentConstructor
