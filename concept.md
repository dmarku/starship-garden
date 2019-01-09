---
title: Starship Garden -- Concept
author: Markus Dittmann
---

# Premise

- Provide a playful interface to generate sound/ambience/music
- visual changes are mirrored in the sound and vice versa
- garden as a visual metaphor
- plants emit sound
- plants can be modified, this changes their appearance and sound

# Implementation

## In-Universe Interaction

- interaction verbs are represented via hand-held tools
- a user can hold one item or none at any time
- _seeding_ - choose a _seed_ to place on the ground:
- _planting_ - use a _shovel_ on a seed on the ground. Commit to positioning. Consumes the seed, creates a new plant at seedling stage at that point. No/very few audible properties in this stage.
- _watering_ - pick up a _watering can_ to grow plants in _complexity_, e.g. harmonic overtones
- _nutrition_ - use _fertilizer_ on a plant to increase its _strength_, e.g. lower base frequency
- positioning will be a visual-only property, for organization and arrangement. Could be interesting for spatial audio, but that's out of scope.

## User Interaction

- _pick up item_
- _drop item_
- _select tool_
- _use tool_

* _access tool selection_ from a menu, can be summoned or dismissed, alternative quick access by hotkey
* user can hold one item at a time
* _pick up_ works on seeds in the world and tools from the tool selection
* _dropping_ leaves a seed on the ground, despawns a tool, does... nothing with empty hands
* _using_ a tool starts its corresponding interaction verb

## Plant Parameters

- size -> tree height & loudness; increased by light energy
- strength -> tree diameter & base frequency; increased by nutrition
- health -> branch depth & overtone depth; increased by watering

# Presentation

**Abstract representation.** The world will be rendered in 3D. We are in a garden in space with plants that emit sounds; keep the shapes familiar, but the style abstract. This should help development time and save computation resources, which is especially important for VR. Non-VR presentation will be a top-down view for quick and easy mouse interaction, slightly tilted for better depth perception.

# Technical Choices

The project will use web technology. I'm familiar with that tech stack and it has advantages in distributing the project on different systems. The heavy lifting is on the client-side, though there'll be a small server part for loading/storing levels. It will be implemented in TypeScript and compiled to JavaScript as that adds nice type-safety when it's useful. The project should run on the latest Firefox/Chrome versions, everything else is nice to have. Audio will be implemented directly in the Web Audio API since it allows direct access to waveform generation. Visuals will use Babylon.js. Among the three major ones I've looked at, it's supposed to be the most stable and hopefully won't break anything. AFrame and Three.js still seem pretty unstable. A Sony developer favored Babylon for high-profile company projects: http://www.html5gamedevs.com/topic/37703-babylonjs-vs-threejs-choosing-a-webgl-framework-for-sony/

# Other Notes

- space doesn't really matter to me, it's just a neat setting and changing it won't impact the experience with abstract visuals
