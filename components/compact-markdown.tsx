import type { Components } from "react-markdown";

// Compact styling for short AI text (analysis, coach replies). Raw HTML in the markdown is dropped (skipHtml).
export const MD: Components = {
  p: (props) => <p className="mt-2 first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  h1: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  h2: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  h3: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-4">
      {children}
    </a>
  ),
  img: () => null,
};
