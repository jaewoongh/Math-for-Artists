int steps = 1;
int whichWave = 1;  //1: Saw, 2: Square
String formula = "sin(x)";
long timer = 0;
long timing = 300;

void setup() {
  size(600, 200);
}

void draw() {
  background(0, 200, 180);
  noFill(); stroke(255); strokeWeight(2);
  beginShape();
  for(int x = 0; x < width; x++) {
    float y = 100;
    for(int i = 0; i < steps*whichWave; i += whichWave) {
      y += sin(x*0.042*(i+1))*40/(i+1);
    }
    vertex(x, y);
  }
  endShape();
  
  fill(255); textSize(24); text(steps, 4, 30);
  fill(255, 200); textSize(10); text(formula, 35, 10, width-40, height-20);
  
  if(millis() - timer > timing) {
    steps++;
    if(steps < 100) formula += " + sin(" + steps*whichWave + "x)/" + steps*whichWave;
    timer = millis();
  }
}

void mousePressed() {
  steps = 1;
  whichWave = whichWave == 1 ? 2 : 1;
  formula = whichWave == 1 ? "sin(x)" : "sin(2x)/2";
}
