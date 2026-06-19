import { setupNotion } from "../src/setup/notionSetup";

const notionToken = process.env.NOTION_TOKEN;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

if (!notionToken || !parentPageId) {
  console.error("NOTION_TOKEN and NOTION_PARENT_PAGE_ID are required.");
  process.exit(1);
}

await setupNotion({ notionToken, parentPageId });
