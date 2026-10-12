
import api from "./api";

// Retrieve active categories for the submission form.
export async function getSpotCategories() {
  const response = await api.get("/spots/categories/");

  const categories = Array.isArray(response.data)
    ? response.data
    : response.data?.results || [];

  return categories.filter((category) => category.is_active);
}

// Create the HiddenSpot record.
// The backend automatically assigns the current user
// and sets the submission status to PENDING.
export async function createHiddenSpot(data) {
  const response = await api.post("/spots/", {
    name: data.name,
    description: data.description,
    category: data.category,
    latitude: data.latitude,
    longitude: data.longitude,
  });

  return response.data;
}

// Upload one image to an existing HiddenSpot.
export async function uploadHiddenSpotImage(spotId, file) {
  const formData = new FormData();

  formData.append("spot", String(spotId));
  formData.append("file", file);
  formData.append("media_type", "IMAGE");

  const response = await api.post(
    "/spots/media/upload/",
    formData
  );

  return response.data;
}

// Complete submission workflow.
// Images are uploaded after the spot has been created.
export async function submitHiddenSpot(data) {
  const spot = await createHiddenSpot(data);

  const failedImages = [];

  for (const file of data.images || []) {
    try {
      await uploadHiddenSpotImage(spot.id, file);
    } catch (error) {
      failedImages.push({
        filename: file.name,
        error,
      });
    }
  }

  return {
    spot,
    failedImages,
  };
}
