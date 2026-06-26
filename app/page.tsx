import { getHomepageContent } from "./homepage-shell";

export const dynamic = "force-static";

export default function Home() {
  return <div dangerouslySetInnerHTML={{ __html: getHomepageContent() }} />;
}
