import { QuartzComponent, QuartzComponentConstructor } from "./types"

const MatrixControls: QuartzComponent = () => {
  return (
    <div id="matrix-controls" style={{ display: "none" }}>
      <div className="matrix-control-panel">
        <h3>🎛️ 数字流控制</h3>
        <div className="control-group">
          <label>强度:</label>
          <select id="matrix-intensity">
            <option value="low">低</option>
            <option value="medium" selected>
              中
            </option>
            <option value="high">高</option>
          </select>
        </div>
        <div className="control-group">
          <label>速度:</label>
          <select id="matrix-speed">
            <option value="slow">慢</option>
            <option value="normal" selected>
              正常
            </option>
            <option value="fast">快</option>
          </select>
        </div>
        <div className="control-group">
          <label>字符:</label>
          <select id="matrix-characters">
            <option value="mixed" selected>
              混合
            </option>
            <option value="code">代码</option>
            <option value="japanese">日文</option>
            <option value="binary">二进制</option>
          </select>
        </div>
        <div className="control-group">
          <label>
            <input type="checkbox" id="matrix-flicker" checked /> 闪烁效果
          </label>
        </div>
        <div className="control-group">
          <label>
            <input type="checkbox" id="matrix-scanline" checked /> 扫描线
          </label>
        </div>
      </div>
    </div>
  )
}

export default (() => MatrixControls) satisfies QuartzComponentConstructor
