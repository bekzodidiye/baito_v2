import io
from PIL import Image

img = Image.new('RGB', (1, 1), color = 'red')
img.save('real_test.jpg')
