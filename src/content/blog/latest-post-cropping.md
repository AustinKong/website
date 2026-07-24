---
title: Cropping Images Without Surprises
description: Notes on using aspect ratios and object-fit so future images can vary without breaking the card.
date: 2026-04-17
image: https://i.pinimg.com/1200x/ed/1b/1c/ed1b1cfc9cb099c663574198c703d70c.jpg
imageAlt: A moody photograph with strong composition and negative space
draft: false
---

Image sizes drift over time. The component should not.

## The rule

Every card image gets the same frame and the same crop behavior, regardless of the source image dimensions.

## The implementation

The important pieces are:

- a fixed aspect ratio on the frame
- `overflow: hidden`
- `object-fit: cover`
- `object-position: center`

## Result

Future posts can use almost any source image and still look consistent in the grid.
