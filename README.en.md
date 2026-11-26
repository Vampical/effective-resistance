# Effective Resistance

[Русская документация](README.md)

A TERA Toolbox module that displays enemy resistance after accounting for your physical and magical piercing and flat resistance ignore.

Resistance values received from the game already include active resistance reductions. The module does not calculate those reductions again: it applies only your character's personal stats. Physical and magical values are calculated independently.

The module works automatically, without commands or settings. It does not query the DataCenter, track buffs or send additional packets. The display changes only when new resistance values arrive from the game. Until your character's stats are received, the original values pass through unchanged.

To install, place the `effective-resistance` folder in `Toolbox/mods` and reconnect to the game. Disable other modules that recalculate the same resistance values to avoid applying the calculation twice.
