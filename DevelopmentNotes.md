# Development Notes

- After implementing the sound of a tree with a sine wave that changes proportionally and continuously to tree size, putting down any number of trees and scaling them to different sizes becomes a dissonant cacophony of out-of-phase sine waves. I'm currently not sure how to remedy that nightmare.

  - if you don't have any previous experience in sound/music, finding a synthesizer "patch" that is simple, sounds good in polyphony and controls easy is difficult (maybe Tone.js, but couldn't get that working). Went with custom graph of sine, envelope sine

  - adding an long-term envelope to a tree's sound helps a bit in terms of variation, but ultimately still sounds terrible. :/

  - rounding to chromatic notes makes it pretty good. Might be interesting to experiment with different scales (maybe as other plants?)

- If you implement scene persistence, implement removing things as soon as possible! Otherwise everything gets crowded by unremovable trees

  - despite babylon not having a 'scene graph', deleting a hierarchy of objects via transform parenting is the default operation of a TransformNode's `dispose()` method. Neat.

- At the moment, the prototype is more or less a sound editor. You can add waveform-trees and change their frequency/height. None of the growing and grooming over time is implemented. Sorting out the sound composition with multiple trees has priority. When the nightmare soundscapes are banished, I can think of an ecosystem.
