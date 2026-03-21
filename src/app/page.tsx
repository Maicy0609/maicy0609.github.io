"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Music,
  FileAudio,
  Settings,
  ArrowRight,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Globe,
  Music2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";
import { useConverterStore } from "@/lib/store";
import { MidiParser, getTrackInfo } from "@/lib/core/midi-parser";
import { AudioProcessor } from "@/lib/core/audio-processor";
import { BeatDetector, median } from "@/lib/core/beat-detector";
import {
  convertAngleData,
  convertZipperAngle,
  convertAudioAngleData,
  convertAudioZipper,
  generateMapJson,
} from "@/lib/core/map-data";

export default function Home() {
  const { locale, t, setLocale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    file,
    fileName,
    fileType,
    inputSource,
    convertMode,
    trackInfo,
    octaveOffset,
    audioSampleMode,
    heightMin,
    heightMax,
    baseBpm,
    customAngle,
    isProcessing,
    processingStep,
    progress,
    resultJson,
    resultFileName,
    stats,
    error,
    setFile,
    setInputSource,
    setConvertMode,
    setTrackInfo,
    toggleTrack,
    setOctaveOffset,
    setAudioSampleMode,
    setHeightMin,
    setHeightMax,
    setBaseBpm,
    setCustomAngle,
    setProcessing,
    setResult,
    setError,
    reset,
  } = useConverterStore();

  // 当文件类型改变时自动设置输入源
  useEffect(() => {
    if (fileType) {
      setInputSource(fileType);
    }
  }, [fileType, setInputSource]);

  // 解析 MIDI 文件获取轨道信息
  const parseMidiTracks = useCallback(
    async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parser = new MidiParser();
        const midiFile = parser.parse(arrayBuffer);
        const tracks = getTrackInfo(midiFile);
        setTrackInfo(
          tracks.map((t) => ({
            id: t.id,
            size: t.size,
            enabled: true,
          }))
        );
      } catch (err) {
        console.error("Failed to parse MIDI:", err);
        setError(t("error.invalidMidi"));
      }
    },
    [setTrackInfo, setError, t]
  );

  // 文件选择处理
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();

      if (ext === "mid" || ext === "midi") {
        setFile(selectedFile);
        await parseMidiTracks(selectedFile);
      } else if (ext === "wav") {
        setFile(selectedFile);
      } else {
        setError(t("error.invalidFormat"));
      }
    },
    [setFile, parseMidiTracks, setError, t]
  );

  // 拖放处理
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // 点击上传
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // 执行转换
  const handleConvert = useCallback(async () => {
    if (!file) {
      setError(t("error.noFile"));
      return;
    }

    setProcessing(true, t("convert.analyzing"), 10);

    try {
      let json: string;
      let outputName: string;
      let estimatedBpm = 120;

      if (inputSource === "midi") {
        // MIDI 处理
        setProcessing(true, t("convert.parsingMidi"), 20);

        const arrayBuffer = await file.arrayBuffer();
        const parser = new MidiParser();
        const midiFile = parser.parse(arrayBuffer);

        setProcessing(true, t("convert.parsingMidi"), 40);

        const disabled = trackInfo.map((t) => !t.enabled);
        const melodyList = parser.parseToMelodyList(midiFile, disabled);
        const usDelayList = parser.melodyToUsDelayList(melodyList, octaveOffset);

        // 计算估计 BPM
        const rwBpmList = usDelayList.map((us) => (60.0 * 1000 * 1000) / us / 12.0);
        estimatedBpm = median(rwBpmList);

        setProcessing(true, t("convert.generatingLevel"), 60);

        if (convertMode === "angle") {
          const result = convertAngleData(usDelayList, baseBpm);
          json = generateMapJson(result.tileDataList, result.mapSetting, true);
          estimatedBpm = result.mapSetting.bpm;
        } else {
          const result = convertZipperAngle(usDelayList, customAngle, estimatedBpm);
          json = generateMapJson(result.tileDataList, result.mapSetting, true);
        }

        outputName = file.name.replace(/\.(mid|midi)$/i, `_${convertMode}.adofai`);

        setProcessing(true, t("convert.generatingLevel"), 90);

        setResult(json, outputName, {
          tileCount: usDelayList.length + 1,
          bpm: baseBpm ?? estimatedBpm,
          duration: usDelayList.reduce((a, b) => a + b, 0) / 1000000,
          trackCount: trackInfo.length,
        });
      } else {
        // 音频处理
        setProcessing(true, t("convert.detectingBeats"), 20);

        const processor = new AudioProcessor();
        const loaded = await processor.load(file);

        if (!loaded) {
          throw new Error(t("error.fileLoadFailed"));
        }

        setProcessing(true, t("convert.detectingBeats"), 40);

        const detector = new BeatDetector();
        let beatTimes: number[];

        if (audioSampleMode === "peak") {
          const energySignal = processor.getEnergySignal();
          beatTimes = detector.detectPeaks(energySignal, processor.getSampleRate(), heightMin, heightMax);
        } else {
          beatTimes = detector.detectAllSamples(processor.getSampleRate(), processor.getTotalSamples());
        }

        if (beatTimes.length === 0) {
          throw new Error(t("error.noBeatsDetected"));
        }

        estimatedBpm = BeatDetector.estimateBpm(beatTimes);

        setProcessing(true, t("convert.generatingLevel"), 60);

        if (convertMode === "angle") {
          const result = convertAudioAngleData(beatTimes, baseBpm, estimatedBpm);
          json = generateMapJson(result.tileDataList, result.mapSetting, true);
          estimatedBpm = result.mapSetting.bpm;
        } else {
          const result = convertAudioZipper(beatTimes, customAngle, estimatedBpm);
          json = generateMapJson(result.tileDataList, result.mapSetting, true);
        }

        const modeSuffix = audioSampleMode === "peak" ? "_peak" : "_full";
        outputName = file.name.replace(/\.wav$/i, `${modeSuffix}_${convertMode}.adofai`);

        setProcessing(true, t("convert.generatingLevel"), 90);

        setResult(json, outputName, {
          tileCount: beatTimes.length,
          bpm: baseBpm ?? estimatedBpm,
          duration: processor.getDuration(),
          sampleRate: processor.getSampleRate(),
          beatCount: beatTimes.length,
        });
      }
    } catch (err) {
      console.error("Conversion error:", err);
      setError(err instanceof Error ? err.message : t("error.processingFailed"));
    }
  }, [
    file,
    inputSource,
    convertMode,
    trackInfo,
    octaveOffset,
    audioSampleMode,
    heightMin,
    heightMax,
    baseBpm,
    customAngle,
    setProcessing,
    setResult,
    setError,
    t,
  ]);

  // 下载结果
  const handleDownload = () => {
    if (!resultJson || !resultFileName) return;

    const blob = new Blob([resultJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 重置
  const handleReset = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl"
            >
              <Music2 className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">{t("app.title")}</h1>
              <p className="text-xs text-white/60">{t("app.version")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={locale} onValueChange={(v) => setLocale(v as "en_US" | "zh_CN")}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_US">English</SelectItem>
                <SelectItem value="zh_CN">简体中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload & Settings */}
          <div className="space-y-6">
            {/* Upload Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {t("upload.title")}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {t("upload.supportedFormats")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? "border-purple-400 bg-purple-500/20"
                        : "border-white/20 hover:border-white/40 hover:bg-white/5"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <AnimatePresence mode="wait">
                      {file ? (
                        <motion.div
                          key="file-info"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex flex-col items-center gap-3"
                        >
                          {fileType === "midi" ? (
                            <Music className="w-12 h-12 text-purple-400" />
                          ) : (
                            <FileAudio className="w-12 h-12 text-blue-400" />
                          )}
                          <div>
                            <p className="text-white font-medium">{fileName}</p>
                            <p className="text-white/60 text-sm">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-white/10 text-white">
                            {fileType?.toUpperCase()}
                          </Badge>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="upload-prompt"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-3"
                        >
                          <div className="p-4 bg-white/10 rounded-full">
                            <Upload className="w-8 h-8 text-white/60" />
                          </div>
                          <p className="text-white/80">{t("upload.dragDrop")}</p>
                          <p className="text-white/40 text-sm">{t("upload.maxSize")}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Conversion Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {t("mode.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={convertMode}
                    onValueChange={(v) => setConvertMode(v as "angle" | "zipper")}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="angle"
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        convertMode === "angle"
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <RadioGroupItem value="angle" id="angle" className="sr-only" />
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">{t("mode.angle")}</p>
                        <p className="text-white/60 text-xs mt-1">{t("mode.angleDesc")}</p>
                      </div>
                    </Label>

                    <Label
                      htmlFor="zipper"
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        convertMode === "zipper"
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <RadioGroupItem value="zipper" id="zipper" className="sr-only" />
                      <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">{t("mode.zipper")}</p>
                        <p className="text-white/60 text-xs mt-1">{t("mode.zipperDesc")}</p>
                      </div>
                    </Label>
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>

            {/* Parameters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {t("params.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* MIDI Parameters */}
                  {inputSource === "midi" && trackInfo.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-white/80">{t("params.trackSelection")}</Label>
                      <p className="text-white/40 text-sm">
                        {t("params.trackCount", { count: trackInfo.length })}
                      </p>
                      <ScrollArea className="h-40 rounded-lg bg-black/20 p-2">
                        <div className="space-y-2">
                          {trackInfo.map((track) => (
                            <div
                              key={track.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={track.enabled}
                                  onCheckedChange={() => toggleTrack(track.id)}
                                />
                                <span className="text-white/80">
                                  Track {track.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-white/60">
                                  {track.size} events
                                </Badge>
                                <Badge
                                  variant={track.enabled ? "default" : "secondary"}
                                  className={
                                    track.enabled
                                      ? "bg-green-500/20 text-green-400"
                                      : "bg-red-500/20 text-red-400"
                                  }
                                >
                                  {track.enabled ? t("params.trackEnabled") : t("params.trackDisabled")}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Octave Offset (MIDI) */}
                  {inputSource === "midi" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-white/80">{t("params.octaveOffset")}</Label>
                        <span className="text-white font-mono">{octaveOffset}</span>
                      </div>
                      <p className="text-white/40 text-sm">{t("params.octaveDesc")}</p>
                      <Slider
                        value={[octaveOffset]}
                        onValueChange={([v]) => setOctaveOffset(v)}
                        min={-10}
                        max={10}
                        step={1}
                        className="py-4"
                      />
                    </div>
                  )}

                  {/* Audio Parameters */}
                  {inputSource === "audio" && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-white/80">{t("params.audioMode")}</Label>
                        <RadioGroup
                          value={audioSampleMode}
                          onValueChange={(v) => setAudioSampleMode(v as "peak" | "full")}
                          className="grid grid-cols-2 gap-3"
                        >
                          <Label
                            htmlFor="peak"
                            className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                              audioSampleMode === "peak"
                                ? "border-purple-500 bg-purple-500/20"
                                : "border-white/20"
                            }`}
                          >
                            <RadioGroupItem value="peak" id="peak" className="sr-only" />
                            <span className="text-white font-medium">{t("params.peakSampling")}</span>
                            <span className="text-white/60 text-xs">{t("params.peakSamplingDesc")}</span>
                          </Label>
                          <Label
                            htmlFor="full"
                            className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                              audioSampleMode === "full"
                                ? "border-purple-500 bg-purple-500/20"
                                : "border-white/20"
                            }`}
                          >
                            <RadioGroupItem value="full" id="full" className="sr-only" />
                            <span className="text-white font-medium">{t("params.fullSampling")}</span>
                            <span className="text-white/60 text-xs">{t("params.fullSamplingDesc")}</span>
                          </Label>
                        </RadioGroup>
                      </div>

                      {audioSampleMode === "peak" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/80">{t("params.heightMin")}</Label>
                            <Input
                              type="number"
                              value={heightMin}
                              onChange={(e) => setHeightMin(Number(e.target.value))}
                              min={0}
                              max={32767}
                              className="bg-black/20 border-white/20 text-white"
                            />
                            <p className="text-white/40 text-xs">{t("params.heightMinDesc")}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/80">{t("params.heightMax")}</Label>
                            <Input
                              type="number"
                              value={heightMax}
                              onChange={(e) => setHeightMax(Number(e.target.value))}
                              min={0}
                              max={32767}
                              className="bg-black/20 border-white/20 text-white"
                            />
                            <p className="text-white/40 text-xs">{t("params.heightMaxDesc")}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <Separator className="bg-white/10" />

                  {/* Base BPM (angle mode) */}
                  {convertMode === "angle" && (
                    <div className="space-y-2">
                      <Label className="text-white/80">{t("params.baseBpm")}</Label>
                      <Input
                        type="number"
                        placeholder={t("params.baseBpmAuto")}
                        value={baseBpm ?? ""}
                        onChange={(e) =>
                          setBaseBpm(e.target.value ? Number(e.target.value) : null)
                        }
                        min={1}
                        className="bg-black/20 border-white/20 text-white placeholder:text-white/40"
                      />
                      <p className="text-white/40 text-sm">{t("params.baseBpmDesc")}</p>
                    </div>
                  )}

                  {/* Custom Angle (zipper mode) */}
                  {convertMode === "zipper" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-white/80">{t("params.customAngle")}</Label>
                        <span className="text-white font-mono">{customAngle}°</span>
                      </div>
                      <Slider
                        value={[customAngle]}
                        onValueChange={([v]) => setCustomAngle(v)}
                        min={1}
                        max={180}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-white/40 text-sm">{t("params.customAngleDesc")}</p>
                      <p className="text-white/40 text-xs">{t("params.angleRange")}</p>
                      {customAngle > 0 && (
                        <p className="text-purple-400 text-sm">
                          {t("convert.magicNumber", {
                            angle: customAngle,
                            magic: (180 / customAngle).toFixed(2),
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Panel - Convert & Results */}
          <div className="space-y-6">
            {/* Convert Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-6">
                  {isProcessing ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <span className="text-white">{processingStep}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleConvert}
                        disabled={!file}
                        className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        size="lg"
                      >
                        {t("convert.title")}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                      {(resultJson || error) && (
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          size="lg"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-200">{error}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Result */}
            <AnimatePresence>
              {resultJson && stats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Success Card */}
                  <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                        <span className="text-green-200 text-lg font-medium">
                          {t("convert.complete")}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        <div className="p-3 bg-black/20 rounded-lg">
                          <p className="text-white/60 text-sm">{t("stats.tileCount")}</p>
                          <p className="text-white text-xl font-bold">{stats.tileCount.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-black/20 rounded-lg">
                          <p className="text-white/60 text-sm">{t("stats.bpm")}</p>
                          <p className="text-white text-xl font-bold">{stats.bpm.toFixed(1)}</p>
                        </div>
                        <div className="p-3 bg-black/20 rounded-lg">
                          <p className="text-white/60 text-sm">{t("stats.duration")}</p>
                          <p className="text-white text-xl font-bold">{stats.duration.toFixed(2)}s</p>
                        </div>
                        {stats.sampleRate && (
                          <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-white/60 text-sm">{t("stats.sampleRate")}</p>
                            <p className="text-white text-xl font-bold">{(stats.sampleRate / 1000).toFixed(1)}k</p>
                          </div>
                        )}
                        {stats.trackCount && (
                          <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-white/60 text-sm">{t("stats.trackCount")}</p>
                            <p className="text-white text-xl font-bold">{stats.trackCount}</p>
                          </div>
                        )}
                        {stats.beatCount && (
                          <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-white/60 text-sm">{t("convert.beatsFound", { count: "" }).replace(":", "")}</p>
                            <p className="text-white text-xl font-bold">{stats.beatCount.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleDownload}
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {t("convert.download")}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="info" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/80">
                    How it works
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 space-y-2">
                    <p>
                      <strong className="text-white">MIDI Input:</strong> Extracts note events and
                      converts them to timing data based on note frequencies.
                    </p>
                    <p>
                      <strong className="text-white">Audio Input:</strong> Uses peak detection on
                      the energy signal to identify beat positions.
                    </p>
                    <p>
                      <strong className="text-white">angleData Mode:</strong> Controls timing
                      through angle variations with a fixed base BPM.
                    </p>
                    <p>
                      <strong className="text-white">Zipper Mode:</strong> Maintains a fixed angle
                      pattern while adjusting BPM dynamically for each tile.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 mt-16">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between text-white/60 text-sm">
          <p>{t("footer.credits")}</p>
          <a
            href="https://github.com/Luxusio/ADOFAI-Midi-Converter"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            {t("footer.github")}
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
