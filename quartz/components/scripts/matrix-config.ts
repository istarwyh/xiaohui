// 数字流效果配置
export interface MatrixConfig {
  intensity: "low" | "medium" | "high"
  speed: "slow" | "normal" | "fast"
  characters: "mixed" | "code" | "japanese" | "binary"
  enableSound: boolean
  enableFlicker: boolean
  enableScanLine: boolean
}

export const defaultConfig: MatrixConfig = {
  intensity: "medium",
  speed: "normal",
  characters: "mixed",
  enableSound: false,
  enableFlicker: true,
  enableScanLine: true,
}

export const intensitySettings = {
  low: { interval: 300, burstChance: 0.1, mouseChance: 0.05 },
  medium: { interval: 150, burstChance: 0.3, mouseChance: 0.08 },
  high: { interval: 80, burstChance: 0.5, mouseChance: 0.12 },
}

export const speedSettings = {
  slow: { min: 5, max: 8 },
  normal: { min: 3, max: 7 },
  fast: { min: 1, max: 4 },
}

export const characterSets = {
  mixed:
    "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ",
  code: "function(){return;}class extends implements interface async await const let var if else for while do switch case break continue try catch finally throw new delete typeof instanceof in of with debugger",
  japanese:
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
  binary: "01",
}
