// micromorph 0.4.5 exports index.mjs without a matching type export, and its
// package.json points "types" at a missing file. Keep the default API typed with
// the signature from its shipped index.d.ts until the package fixes its exports.
declare module "micromorph" {
  export default function micromorph(from: Node, to: Node): Promise<void>
}
