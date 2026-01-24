#!/bin/bash

# 定义源目录和目标目录
SOURCE_DIR="/Users/mac/Desktop/code-open/MyRoad/docs/Vnote"
TARGET_DIR="/Users/mac/Desktop/code-open/quartz/content"

# 确保目标目录存在
mkdir -p "$TARGET_DIR"

# 使用rsync同步文件
# -a: 归档模式，保留所有文件属性
# -v: 详细输出
# -h: 人类可读的格式
# --delete: 删除目标目录中源目录没有的文件
# --exclude: 排除不需要同步的文件和目录
rsync -avh --delete \
    --exclude="index.md" \
    --exclude="membership.md" \
    --exclude=".claude" \
    --exclude="Users" \
    --exclude=".git" \
    --exclude=".gitignore" \
    --exclude=".obsidian" \
    --exclude="node_modules" \
    --exclude=".DS_Store" \
    --exclude=".mypy_cache" \
    --exclude=".prettierrc" \
    --exclude=".windsurfrules" \
    --exclude="package.json" \
    --exclude="package-lock.json" \
    "$SOURCE_DIR/" "$TARGET_DIR/"

echo "✨ Vnote content has been synchronized to Quartz content directory"
