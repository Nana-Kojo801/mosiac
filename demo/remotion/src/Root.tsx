import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, staticFile } from 'remotion';
import { C } from './theme';
import { FPS, SCENES, TOTAL_FRAMES, type Scene } from './data';
import { Background, Captions, FadeOut, TileWipe, musicVolume } from './kit';
import { Hook } from './scenes/Hook';
import { Title } from './scenes/Title';
import { Problem } from './scenes/Problem';
import { Hybrid } from './scenes/Hybrid';
import { Shots } from './scenes/Shots';
import { Guard } from './scenes/Guard';
import { Phone } from './scenes/Phone';
import { Bench } from './scenes/Bench';
import { Close } from './scenes/Close';
import { Thumbnail } from './Thumbnail';

function SceneView({ s }: { s: Scene }) {
  switch (s.kind) {
    case 'hook': return <Hook />;
    case 'title': return <Title />;
    case 'problem': return <Problem />;
    case 'hybrid': return <Hybrid />;
    case 'shots': return <Shots id={s.id} />;
    case 'guard': return <Guard />;
    case 'phone': return <Phone />;
    case 'bench': return <Bench />;
    case 'close': return <Close />;
  }
  throw new Error(`Unknown scene kind ${s.kind}`);
}

function Demo() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {SCENES.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}><SceneView s={s} /></Sequence>
      ))}
      <TileWipe />
      <Captions />
      <FadeOut />
      <Audio src={staticFile('audio/music.wav')} volume={(f) => musicVolume(f / FPS)} />
      {SCENES.map((s) => (
        <Sequence key={`v-${s.id}`} from={Math.round(s.voiceAt * FPS)} name={`voice ${s.id}`}><Audio src={staticFile(s.audio)} /></Sequence>
      ))}
    </AbsoluteFill>
  );
}

export const Root = () => (
  <>
    <Composition id="MosaicDemo" component={Demo} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition id="Thumbnail" component={Thumbnail} width={1280} height={720} fps={FPS} durationInFrames={1} />
  </>
);
