
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
// A landmark is mandatory.
export async function createHiddenSpot(data) {
  const address = data.address?.trim();

  if (!address) {
    throw new Error("Please enter a landmark.");
  }

  const response = await api.post("/spots/", {
    name: data.name,
    description: data.description,
    category: data.category,
    latitude: data.latitude,
    longitude: data.longitude,
    address: address,
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

// Create the HiddenSpot and upload its three images.
// The spot is created before its images are uploaded.
export async function submitHiddenSpot(data) {
  // Validate the landmark before creating the spot.
  if (!data.address?.trim()) {
    throw new Error("Please enter a landmark.");
  }

  // Validate the image count before creating the spot.
  if (!Array.isArray(data.images) || data.images.length !== 3) {
    throw new Error("Exactly 3 images are required.");
  }

  // Create the spot first.
  const spot = await createHiddenSpot(data);

  const uploadedImages = [];
  const failedImages = [];

  // Upload each image individually.
  for (const file of data.images) {
    try {
      const uploadedImage = await uploadHiddenSpotImage(
        spot.id,
        file
      );

      uploadedImages.push(uploadedImage);
    } catch (error) {
      failedImages.push({
        filename: file.name,
        error,
      });
    }
  }

  return {
    spot,
    uploadedImages,
    failedImages,
    isComplete:
      failedImages.length === 0 &&
      uploadedImages.length === 3,
  };
}
