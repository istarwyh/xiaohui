import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import matrixScript from "./scripts/matrix.inline"

const MatrixBackground: QuartzComponent = () => {
  return <></>
}

MatrixBackground.afterDOMLoaded = matrixScript

export default (() => MatrixBackground) satisfies QuartzComponentConstructor
