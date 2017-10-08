EXTERNAL myFunc();
INCLUDE myFile.ink
VAR example = "foo"
VAR num = 23

// Ink language example file, for testing language features.
// This is a comment.
/* This is
   a multiline
   comment */
# This is a global tag.
This is core story text.
This is story text with a tag. # color it blue // and a comment!
    * Some choices
    * Leading into a
- gather.

Gathers and choices can have labels:
    * (labeled) choice.
- (gather) with a label.
Some inline logic:
~ foo = 1
~ runFunc()
{
    stamina > x:
        ~ stamina = 0
    - else:
        ~ stamina = stamina - x
}
=== knot ===
This is a knot with some
    * Choices
        -> stitch
    * Some of which have [bracketed] text
    * { not visit_paris } A choice with gating leading into a -> divert
    * And one that leads into a -> tunnel ->
= stitch (parameter a, b)
-
And back. -> DONE
= divert
-> END
= stitch
-> DONE
=== tunnel ===
tunnel that returns to the original flow. ->->