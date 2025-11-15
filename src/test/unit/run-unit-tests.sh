#!/bin/bash

# Org-mode 单元测试运行脚本

echo "🧪 开始运行 Org-mode 解析单元测试..."
echo ""

# 编译 TypeScript
echo "📦 编译 TypeScript..."
pnpm run compile-tests

if [ $? -ne 0 ]; then
  echo "❌ 编译失败"
  exit 1
fi

echo "✅ 编译完成"
echo ""

# 运行测试
echo "🚀 运行单元测试..."
pnpm run test:unit

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 所有测试通过！"
else
  echo ""
  echo "❌ 部分测试失败"
  exit 1
fi


