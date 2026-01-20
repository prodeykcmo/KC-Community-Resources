// Paste your published Google Sheets CSV URLs here.
// File > Share > Publish to web > (choose sheet) > CSV
const CONFIG = {
  DIRECTORY_CSV_URL: "",      // e.g., "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdFhK6oO45Dr8IerDN1ZaW-18ccfic9J-eTl-cStqXDeWWWO7CH4FZu5HiYHV2euON0JShYRopfec/pub?gid=1123058370&single=true&output=csv"
  LANGUAGES_CSV_URL: "",      // optional; if blank, the site uses a built-in language list
  SUBMIT_UPDATE_URL: "",      // Google Form link
  DEFAULT_LANGUAGE_NAME: "English",
  DEFAULT_CATEGORY: "All",
  // Column names expected in your CSV (from FIND RESOURCES (TRANSLATED))
  COLUMNS: {
    category: "Category",
    org: "Organization Name",
    help: "What they help with",
    address: "Address / Area Served",
    phone: "Phone",
    website: "Website",
    translated: "Information (Translated)",
    langs: "Languages Supported",
    verify: "Verification Status",
  }
};
