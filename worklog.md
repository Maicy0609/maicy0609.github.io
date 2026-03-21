# ADOFAI Music Converter Web - Development Worklog

## 项目概述

将 Python 版本的 ADOFAI Music Converter 完全等价移植到纯前端网页版本。

## 技术栈选择

- **框架**: Next.js 16 + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui
- **状态管理**: Zustand
- **动画**: Framer Motion
- **国际化**: 自定义 i18n 方案

## 核心模块移植

### 1. MIDI 解析器 (midi-parser.ts)
- 完全等价移植 Python mido 库的二进制解析逻辑
- 支持读取 MIDI 文件头、轨道、事件
- 实现 `parseToMelodyList` 和 `melodyToUsDelayList` 方法
- 变长整数解析、运行状态处理等细节

### 2. 音频处理器 (audio-processor.ts)
- 使用 Web Audio API 替代 scipy
- 支持 WAV 文件解码
- 实现 `getEnergySignal` 能量信号计算

### 3. 节拍检测器 (beat-detector.ts)
- 完全等价移植 `detect_peaks` 峰值检测算法
- 实现 `detectAllSamples` 全采样模式
- `estimateBpm` BPM 估计算法
- 中位数计算函数

### 4. 地图数据生成器 (map-data.ts)
- 完全等价移植 `convertAngleData` angleData 模式
- 完全等价移植 `convertZipperAngle` 拉链模式
- 完全等价移植 `convertAudioAngleData` 和 `convertAudioZipper`
- JSON 生成逻辑完全保留原版格式

### 5. 国际化 (i18n/)
- 中英文双语支持
- 参数化翻译文本
- 浏览器语言自动检测
- localStorage 持久化

## UI 特性

1. **拖放上传**: 支持拖放文件或点击选择
2. **实时预览**: 参数调整即时反馈
3. **进度显示**: 转换过程可视化
4. **轨道选择**: MIDI 轨道可单独启用/禁用
5. **响应式设计**: 支持移动端和桌面端
6. **深色主题**: 现代化深色 UI

## 输出文件

位置: `/home/z/my-project/download/ADOFAI_Converter_Web.zip`

包含:
- `static-site/`: 静态网站文件，可直接部署
- `source-code/`: 完整源代码，可自行编译
- `README.md`: 使用说明文档

文件大小: 572KB (压缩后)

## 数学等价性验证

所有核心算法完全等价移植:
- 时间公式: `时间 = 旋转角度/180 × 60/BPM`
- angleData 模式: `旋转角度 = 时间 × BPM × 180 / 60`
- Zipper 模式: `BPM = 角度/180 × 60/时间`
- 魔法数字: `Magic Number = 180 / 角度`

## 部署方式

1. 静态部署: 将 `static-site` 上传到任何静态托管服务
2. 本地运行: `npx serve static-site`
3. 源码编译: `bun install && bun run build`
