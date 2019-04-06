---
title: Starship Garden
subtitle: Progress Report
---

## Got done

- research on audio synthesis
- wrote first user story
- project build setup works now
- overhauled environment & plant model

---

### Research on audio synthesis

- synth Workshop last & next week
- Spatial Audio session
- good idea how to create "interesting" sounds

---

### wrote basic user story

- navigation
- initial scene
- interaction verbs: sow, water, fertilize, (crop?), change lighting

---

### project setup works now

- 3D engine: Babylon.js
- Language: TypeScript
- Build System: Webpack & Webpack Dev Server
- got some interaction, **very** basic tree model

---

### overhauled environment & plant model

- light energy -> photosynthesis -> audio volume
  - affect global volume by lighting
  - affect per-plant volume by "crown size"
- plant body size & shape -> fundamental frequency and overtones
  - "tube model", models flute sound and human vocal articulation
  - overtones by branching at integer ratios
    - first harmonic = half the height
    - second harmonic = 1/3rd the height

---

## To Do (next two weeks)

- implement additive/subtractive synthesis with web audio API
- directly manipulate parameters of the model
- come up with interesting game loop
  - slow growth time vs. player attention
  - approach: short, immediate audiovisual feedback for interactions;
    effects on environment and soundscape are more long term
