from io import BytesIO
import os
import subprocess
import tempfile
import uuid

from PIL import Image
from django.core.files import File
from django.core.files.base import ContentFile


def compress_image(image_file):
    image = Image.open(image_file)

    # Convert formats that don't work well with JPEG
    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, "white")

        if image.mode == "P":
            image = image.convert("RGBA")

        if image.mode == "RGBA":
            background.paste(
                image,
                mask=image.getchannel("A")
            )
        else:
            background.paste(image)

        image = background

    else:
        image = image.convert("RGB")

    # Maximum dimensions
    max_width = 1920
    max_height = 1080

    image.thumbnail(
        (max_width, max_height),
        Image.Resampling.LANCZOS
    )

    output = BytesIO()

    image.save(
        output,
        format="JPEG",
        quality=85,
        optimize=True
    )

    output.seek(0)

    return ContentFile(
        output.read(),
        name=f"optimized_image_{uuid.uuid4().hex}.jpg"
    )   

def compress_video(video_file):
    """
    Compress uploaded video using FFmpeg
    and convert it to MP4/H.264.
    """

    input_suffix = os.path.splitext(video_file.name)[1] or ".mp4"

    input_path = None
    output_path = None

    try:
        # Create temporary input file
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=input_suffix
        ) as input_temp:

            for chunk in video_file.chunks():
                input_temp.write(chunk)

            input_path = input_temp.name

        # Create temporary output path
        output_temp = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".mp4"
        )

        output_path = output_temp.name
        output_temp.close()

        # FFmpeg command
        command = [
            "ffmpeg",
            "-y",
            "-i", input_path,

            # Maximum width: 1280px
            # Height is automatically calculated
            # while maintaining aspect ratio.
            "-vf",
            "scale='min(1280,iw)':-2",

            # H.264 video codec
            "-c:v",
            "libx264",

            # Compression preset
            "-preset",
            "medium",

            # Video quality
            "-crf",
            "28",

            # AAC audio
            "-c:a",
            "aac",

            # Audio bitrate
            "-b:a",
            "128k",

            # Better web playback
            "-movflags",
            "+faststart",

            output_path,
        ]

        # Run FFmpeg
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )

        # Check whether FFmpeg succeeded
        if result.returncode != 0:
            raise ValueError(
                "Video compression failed."
            )

        # Open compressed video
        with open(output_path, "rb") as compressed_file:
            compressed_video = File(
                compressed_file,
                name=f"optimized_video_{uuid.uuid4().hex}.mp4"
            )

            compressed_content = ContentFile(
                compressed_video.read(),
                name=compressed_video.name
            )

        return compressed_content

    finally:
        # Remove temporary input file
        if input_path and os.path.exists(input_path):
            os.remove(input_path)

        # Remove temporary output file
        if output_path and os.path.exists(output_path):
            os.remove(output_path)