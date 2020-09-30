# SXML ("S-expression-based XML")

*SXML* is XML written using [s-expr](https://en.wikipedia.org/wiki/S-expression) syntax.

## Syntax

XHTML/XML:

```
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="en"
      lang="en">
  <head>
    <title>An example page</title>
  </head>
  <body>
    <h1 id="greeting">Hi, there!</h1>
    <p data-description="A paragraph">This is just an &gt;&gt;example&lt;&lt; to show XHTML &amp; SXML.</p>
  </body>
</html>
```

Equivalent SXML:
```
(html @xmlns http://www.w3.org/1999/xhtml
      @xml:lang en
      @lang en
  (head (title `An example page))
  (body
    (h1 @id greeting `Hi, there!)
    (p @data-description "A paragraph"
      `This is just an >>example<< to show XHTML & SXML.)
  )
)
```

## Getting Started

* Install [Deno](https://deno.land/) (`curl -fsSL https://deno.land/x/install/install.sh | sh`)
* Clone this repository
* Install *sxml* using `deno install -fA src/sxml.ts`. Do this every time you update the repository so that the latest changes are compiled.
* See `sxml --help` for more information.