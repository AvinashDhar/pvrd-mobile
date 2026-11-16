import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const slides = images.filter(Boolean);
  const { width } = useWindowDimensions();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  if (slides.length === 0) return null;
  const multiple = slides.length > 1;
  const current = Math.min(index, slides.length - 1);

  function go(next: number) {
    const clamped = Math.min(slides.length - 1, Math.max(0, next));
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  }

  return (
    <View style={styles.wrap}>
      <View>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            setIndex(next);
          }}
        >
          {slides.map((uri, slide) => (
            <Pressable
              key={`${uri}-${slide}`}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${name}, image ${slide + 1} of ${slides.length}. Opens a larger view.`}
              onPress={() => setViewer(slide)}
              style={{ width, height: 320 }}
            >
              <Image source={{ uri }} style={styles.hero} contentFit="contain" accessibilityLabel={slide === current ? name : undefined} />
            </Pressable>
          ))}
        </ScrollView>
        <Pressable accessibilityLabel="Zoom image" onPress={() => setViewer(current)} style={styles.zoom}>
          <Text style={styles.zoomText}>+</Text>
        </Pressable>
        {multiple ? (
          <>
            <View pointerEvents="none" style={styles.count}>
              <Text style={styles.countText}>
                {current + 1} / {slides.length}
              </Text>
            </View>
          </>
        ) : null}
      </View>
      {multiple ? (
        <View style={styles.dots}>
          {slides.map((uri, dot) => (
            <View key={`${uri}-dot-${dot}`} style={[styles.dot, dot === current && styles.dotActive]} />
          ))}
        </View>
      ) : null}
      {multiple ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {slides.map((uri, thumb) => {
            const selected = thumb === current;
            return (
              <Pressable
                key={`${uri}-thumb-${thumb}`}
                accessibilityLabel={`Show image ${thumb + 1}`}
                accessibilityState={{ selected }}
                onPress={() => go(thumb)}
                style={[styles.thumb, selected && styles.thumbSelected]}
              >
                <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {viewer != null ? (
        <ImageViewer
          images={slides}
          name={name}
          start={viewer}
          onClose={(next) => {
            setViewer(null);
            go(next);
          }}
        />
      ) : null}
    </View>
  );
}

function ImageViewer({
  images,
  name,
  start,
  onClose,
}: {
  images: string[];
  name: string;
  start: number;
  onClose: (index: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const bottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const placed = useRef(false);
  const zoom = useRef<ZoomHandle | null>(null);
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const stageHeight = Math.max(240, height - top - bottom - (images.length > 1 ? 148 : 88));

  function show(next: number) {
    const clamped = Math.min(images.length - 1, Math.max(0, next));
    zoom.current?.reset();
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
    setZoomed(false);
  }

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => onClose(index)}>
      <GestureHandlerRootView style={styles.viewer}>
        <View style={[styles.toolbar, { paddingTop: top + 8 }]}>
          <Pressable accessibilityLabel="Close image viewer" onPress={() => onClose(index)} style={styles.tool}>
            <Text style={styles.toolText}>✕</Text>
          </Pressable>
          <Text style={styles.viewerCount}>
            {index + 1} / {images.length}
          </Text>
          <View style={styles.toolRow}>
            <Pressable accessibilityLabel="Zoom out" onPress={() => zoom.current?.zoomBy(1 / 1.25)} style={styles.tool}>
              <Text style={styles.toolText}>−</Text>
            </Pressable>
            <Pressable accessibilityLabel="Zoom in" onPress={() => zoom.current?.zoomBy(1.25)} style={styles.tool}>
              <Text style={styles.toolText}>+</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onLayout={() => {
            if (placed.current) return;
            placed.current = true;
            scroller.current?.scrollTo({ x: start * width, animated: false });
          }}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {images.map((uri, slide) => (
            <ZoomSlide
              key={`${uri}-${slide}`}
              uri={uri}
              name={name}
              width={width}
              height={stageHeight}
              active={slide === index}
              control={zoom}
              onZoomed={setZoomed}
            />
          ))}
        </ScrollView>
        {images.length > 1 ? (
          <View style={[styles.viewerBar, { paddingBottom: bottom + 12 }]}>
            <Pressable accessibilityLabel="Previous image" disabled={index === 0} onPress={() => show(index - 1)} style={styles.tool}>
              <Text style={styles.toolText}>‹</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewerThumbs}>
              {images.map((uri, thumb) => (
                <Pressable
                  key={`${uri}-viewer-${thumb}`}
                  accessibilityLabel={`Show image ${thumb + 1}`}
                  onPress={() => show(thumb)}
                  style={[styles.viewerThumb, thumb === index && styles.viewerThumbSelected]}
                >
                  <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              accessibilityLabel="Next image"
              disabled={index === images.length - 1}
              onPress={() => show(index + 1)}
              style={styles.tool}
            >
              <Text style={styles.toolText}>›</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.hint, { paddingBottom: bottom + 16 }]}>Pinch or double-tap to zoom</Text>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

type ZoomHandle = {
  zoomBy: (factor: number) => void;
  reset: () => void;
};

function ZoomSlide({
  uri,
  name,
  width,
  height,
  active,
  control,
  onZoomed,
}: {
  uri: string;
  name: string;
  width: number;
  height: number;
  active: boolean;
  control: { current: ZoomHandle | null };
  onZoomed: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const isActive = useSharedValue(active);

  useEffect(() => {
    isActive.value = active;
    if (active) return;
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
  }, [active, isActive, savedScale, savedTx, savedTy, scale, tx, ty]);

  useEffect(() => {
    if (!active) return;
    control.current = {
      zoomBy(factor) {
        const next = clamp(scale.value * factor);
        scale.value = withTiming(next, { duration: 180 });
        savedScale.value = next;
        if (next <= 1.01) {
          tx.value = withTiming(0);
          ty.value = withTiming(0);
          savedTx.value = 0;
          savedTy.value = 0;
        }
      },
      reset() {
        scale.value = withTiming(1, { duration: 160 });
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      },
    };
  }, [active, control, savedScale, savedTx, savedTy, scale, tx, ty]);

  useAnimatedReaction(
    () => isActive.value && scale.value > 1.02,
    (zoomed, previous) => {
      if (zoomed !== previous) runOnJS(onZoomed)(zoomed);
    },
  );

  const lastTap = useRef(0);
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onUpdate((event) => {
        scale.value = clamp(savedScale.value * event.scale);
      })
      .onEnd(() => {
        if (scale.value <= 1.02) {
          scale.value = withTiming(1);
          tx.value = withTiming(0);
          ty.value = withTiming(0);
          savedScale.value = 1;
          savedTx.value = 0;
          savedTy.value = 0;
        } else {
          savedScale.value = scale.value;
        }
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .manualActivation(true)
      .onTouchesMove((_event, state) => {
        if (scale.value > 1.02) state.activate();
        else state.fail();
      })
      .onUpdate((event) => {
        const maxX = ((scale.value - 1) * width) / 2;
        const maxY = ((scale.value - 1) * height) / 2;
        tx.value = Math.min(maxX, Math.max(-maxX, savedTx.value + event.translationX));
        ty.value = Math.min(maxY, Math.max(-maxY, savedTy.value + event.translationY));
      })
      .onEnd(() => {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [height, savedScale, savedTx, savedTy, scale, tx, ty, width]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  function toggleZoom() {
    const now = Date.now();
    if (now - lastTap.current > 280) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (scale.value > 1.02) {
      scale.value = withTiming(1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
      return;
    }
    scale.value = withTiming(2.5);
    savedScale.value = 2.5;
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, animated]}>
        <Pressable accessibilityLabel={name} accessibilityHint="Double tap to zoom" onPress={toggleZoom} style={{ width, height }}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function clamp(value: number) {
  "worklet";
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.white },
  hero: { width: "100%", height: 320, backgroundColor: colors.white },
  zoom: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001F3D",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  zoomText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 28 },
  count: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "rgba(0,60,108,0.25)" },
  dotActive: { width: 18, backgroundColor: colors.lime },
  thumbs: { gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  thumbSelected: { borderColor: colors.navy },
  thumbImage: { width: "100%", height: "100%" },
  viewer: { flex: 1, backgroundColor: "#000000" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  toolRow: { flexDirection: "row", gap: 8 },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26 },
  viewerCount: { color: colors.white, fontFamily: fonts.medium, fontSize: 14 },
  viewerBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  viewerThumbs: { gap: 8, alignItems: "center" },
  viewerThumb: { width: 48, height: 48, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent", opacity: 0.7 },
  viewerThumbSelected: { borderColor: colors.lime, opacity: 1 },
  hint: { color: "rgba(255,255,255,0.7)", fontFamily: fonts.regular, fontSize: 12, textAlign: "center" },
});
