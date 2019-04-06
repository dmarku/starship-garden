# User Story

- user enters web page
- page shows a selection of available gardens. Name & Preview
- user clicks on a new garden
- change to 3D view, most of the page is a WebGL canvas

- Garden is a planar surface, loose ground for planting
- all the scenery is visible, every plantable ground patch is accesible by mouse cursor
- there's one or a couple of trees already grown, they produce sound
- some decorative foliage
- the sky is an artificial dome, consisting of several light panels. They are lit and colored to resemble natural sky
- user has a set of tools he can see and select one

  - _seeds_
  - _watering can_
  - _fertilizer_

- user selects seed
- seed shows up as selected tool (held in hand and/or highlighted)
- ground is highlighted below the cursor to indicate placement is possible
- on click, the seed disappears from the user's hand and a new sapling is placed on the ground
- sapling does not produce any sound yet. has to reach a growth threshol

## WIP parameter modification

- there are virtual handles on the trees to directly control tree properties
- modify overall size to control fundamental frequency and add overtones
- change crown size (=leave richness) to control amplitude
- not sure about growth process model yet (watering and nutrition)
- adjust global lighting conditions to change "master volume"

## Feedback Lena

- no more than three minutes to see an effect,
  maybe immediate feedback like lit response
- water & nutrient to accelerate growth
- energy model for volume, light -> leaves -> energy -> amplitude (photo*synthesis*)
- nutrient for strength & branching
- water for size & leave/crown richness
