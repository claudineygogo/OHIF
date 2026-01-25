import numpy as np
from scorer import dice_score

# Create identical masks
mask = np.zeros((5, 10, 10), dtype=np.uint8)
mask[2, 3:7, 3:7] = 1  # a small cube
score = dice_score(mask, mask)
print('Dice score for identical masks:', score)
