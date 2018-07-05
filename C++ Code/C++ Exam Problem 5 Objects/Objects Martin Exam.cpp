#include <iostream>
#include <string>
using namespace std;

class Shapes{
public:
	int sides;
	string name;

	
}triangle, pentagon;

int main() {
	
	triangle.name = "Triangle";
	triangle.sides = 3;
	pentagon.name = "Pentagon";
	pentagon.sides = 5;

	cout << triangle.name << ": " << triangle.sides << endl;
	cout << pentagon.name << ": " << pentagon.sides << endl;

	int o; //This is for you to see the output. :)
	cin >> o;
		 

	return 0;
}