import { createClient } from "@supabase/supabase-js";

const url = "https://egcxjuudphnbjwqhhbra.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(url, key);

async function testStorageUpload() {
  console.log("Testing upload to avatars bucket on egcxjuudphnbjwqhhbra...");
  const dummyBuffer = Buffer.from("test image buffer");
  const testPath = `test/test_${Date.now()}.txt`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(testPath, dummyBuffer, { contentType: "text/plain", upsert: true });

  if (error) {
    console.error("❌ Storage upload failed:", error.message);
  } else {
    console.log("🎉 STORAGE UPLOAD SUCCESSFUL!", data.path);
    const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(testPath);
    console.log("Public URL:", pubData.publicUrl);

    // Clean up
    await supabase.storage.from("avatars").remove([testPath]);
    console.log("Cleaned up test file.");
  }
}

testStorageUpload();
