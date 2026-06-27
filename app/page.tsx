import { getHomepageContent } from "./homepage-shell";

export const dynamic = "force-static";

export default function Home() {
  return (
    <main
      className="pb-2 lg:pb-6"
      dangerouslySetInnerHTML={{ __html: getHomepageContent() }}
    />
  );
}
