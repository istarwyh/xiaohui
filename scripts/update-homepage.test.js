import test, { describe } from "node:test"
import assert from "node:assert"
import { sluggify } from "./update-homepage.js"

describe("sluggify", () => {
  describe("basic transformations", () => {
    test("converts spaces to hyphens", () => {
      assert.strictEqual(sluggify("hello world"), "hello-world")
      assert.strictEqual(sluggify("multiple   spaces"), "multiple---spaces")
      assert.strictEqual(sluggify("  leading and trailing  "), "--leading-and-trailing--")
    })

    test("converts ampersands to -and-", () => {
      assert.strictEqual(sluggify("rock & roll"), "rock--and--roll")
      assert.strictEqual(sluggify("A&B"), "A-and-B")
      assert.strictEqual(sluggify("&&"), "-and--and-")
    })

    test("converts percent to -percent", () => {
      assert.strictEqual(sluggify("100%"), "100-percent")
      assert.strictEqual(sluggify("50% off"), "50-percent-off")
      assert.strictEqual(sluggify("%%"), "-percent-percent")
    })

    test("removes question marks", () => {
      assert.strictEqual(sluggify("what?"), "what")
      assert.strictEqual(sluggify("really???"), "really")
      assert.strictEqual(sluggify("how? why?"), "how-why")
    })

    test("removes hash symbols", () => {
      assert.strictEqual(sluggify("#heading"), "heading")
      assert.strictEqual(sluggify("tag#anchor"), "taganchor")
      assert.strictEqual(sluggify("###"), "")
    })
  })

  describe("path handling", () => {
    test("processes each path segment independently", () => {
      assert.strictEqual(sluggify("folder name/file name"), "folder-name/file-name")
      assert.strictEqual(sluggify("path/to/my file"), "path/to/my-file")
    })

    test("preserves forward slashes", () => {
      assert.strictEqual(sluggify("a/b/c"), "a/b/c")
      assert.strictEqual(sluggify("deep/nested/folder/structure"), "deep/nested/folder/structure")
    })
  })

  describe("combined transformations", () => {
    test("handles multiple special characters", () => {
      assert.strictEqual(sluggify("What's up? 100% & ready!"), "What's-up-100-percent--and--ready!")
      assert.strictEqual(sluggify("path/Q&A #1 - 50%"), "path/Q-and-A-1---50-percent")
    })
  })

  describe("Chinese and Unicode characters", () => {
    test("preserves Chinese characters", () => {
      assert.strictEqual(sluggify("中文"), "中文")
      assert.strictEqual(sluggify("测试文件"), "测试文件")
    })

    test("preserves Chinese brackets and punctuation", () => {
      assert.strictEqual(sluggify("【标题】"), "【标题】")
      assert.strictEqual(sluggify("名字：描述"), "名字：描述")
      assert.strictEqual(sluggify("「引用」"), "「引用」")
    })

    test("handles mixed Chinese and English with spaces", () => {
      assert.strictEqual(sluggify("中文 English 混合"), "中文-English-混合")
      assert.strictEqual(sluggify("【标题】 Content"), "【标题】-Content")
    })
  })

  describe("real-world file paths", () => {
    test("handles actual blog post paths", () => {
      assert.strictEqual(
        sluggify("program/bot/【万字长文】 最强 AI Coding：Claude Code 最佳实践"),
        "program/bot/【万字长文】-最强-AI-Coding：Claude-Code-最佳实践",
      )
      assert.strictEqual(
        sluggify("program/llm/【年度总结】从Claude Code到 OneAgent：最佳Agent 构建实践全解析"),
        "program/llm/【年度总结】从Claude-Code到-OneAgent：最佳Agent-构建实践全解析",
      )
      assert.strictEqual(sluggify("life/wisdom/Truth"), "life/wisdom/Truth")
    })

    test("handles paths with multiple special characters", () => {
      assert.strictEqual(
        sluggify("guide/Q&A #1 - 100% Complete?"),
        "guide/Q-and-A-1---100-percent-Complete",
      )
    })
  })

  describe("edge cases", () => {
    test("handles empty string", () => {
      assert.strictEqual(sluggify(""), "")
    })

    test("handles only special characters", () => {
      assert.strictEqual(sluggify("???"), "")
      assert.strictEqual(sluggify("###"), "")
      assert.strictEqual(sluggify("?#?#"), "")
    })

    test("handles only path separators", () => {
      assert.strictEqual(sluggify("/"), "/")
      assert.strictEqual(sluggify("///"), "///")
    })

    test("handles trailing slash", () => {
      assert.strictEqual(sluggify("folder/"), "folder/")
      assert.strictEqual(sluggify("path/to/folder/"), "path/to/folder/")
    })

    test("handles leading slash", () => {
      assert.strictEqual(sluggify("/file"), "/file")
      assert.strictEqual(sluggify("/path/to/file"), "/path/to/file")
    })

    test("handles single characters", () => {
      assert.strictEqual(sluggify("a"), "a")
      assert.strictEqual(sluggify(" "), "-")
      assert.strictEqual(sluggify("&"), "-and-")
      assert.strictEqual(sluggify("%"), "-percent")
      assert.strictEqual(sluggify("?"), "")
      assert.strictEqual(sluggify("#"), "")
    })
  })

  describe("preserves other special characters", () => {
    test("preserves apostrophes", () => {
      assert.strictEqual(sluggify("What's this"), "What's-this")
    })

    test("preserves periods", () => {
      assert.strictEqual(sluggify("v1.0.0"), "v1.0.0")
    })

    test("preserves underscores", () => {
      assert.strictEqual(sluggify("snake_case_file"), "snake_case_file")
    })

    test("preserves dashes", () => {
      assert.strictEqual(sluggify("already-hyphenated"), "already-hyphenated")
    })

    test("preserves exclamation marks", () => {
      assert.strictEqual(sluggify("Hello!"), "Hello!")
    })

    test("preserves emoji", () => {
      assert.strictEqual(sluggify("Hello 👋 World"), "Hello-👋-World")
    })
  })
})
