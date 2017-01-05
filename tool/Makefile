##############################
# make all
# make clean
#
# make sprite
# make clean-sprite
##############################

all: 

clean:

###### sprite 

sprite: ../server/icon.out.css

../server/icon.out.css: ../server/icon.css
	php jdcloud-sprite.php $< -2x -group -sprite icon/icon@2x.png

clean-sprite:
	-rm -rf ../server/icon.out.css ../server/icon/icon@2x-*.png

