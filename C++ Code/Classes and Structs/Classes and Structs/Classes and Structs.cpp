// Structs and Classes
#include <iostream>
#include <string>
using namespace std;

class Animal {           // you use Classes for functions //Structs for constants and variables
public:
	int age;
	string name;
	string color;
	int legCount;



	//constructor
	Animal() {
		//another way of displaying an error
		cout << "Don't forget to initialize this object." << endl;
		// OR 
		if (name = "" || age == NULL || legCount == NULL || color = "")//if 'name' is empty, print this 
			cout << "Don't forget to initialize this object." << endl;

		/*
		age=999;
		name="EMPTY";
		color = "UNFILLED";
		legCount =999;
		*/

	}

	Animal(int a, string n, string c, int l) {
		age = a;
		name = n;
		color = c;
		legCount = l;
	}
};


struct AnimalStruct {
	int age;
	string name;
	string color;
	int legCount;

};

int main() {
	Animal gorilla(5, "Joe", "black", 4); //this is passing information to the class 
	bird.name = "Harry";
	gorilla.name = "Jack Jr.";
	cout << gorilla.name << endl;
	cout << bird.name << endl; //bird doesn't exist, so it will print the stuff that looks crazy
	return 0;
}



// PHYSICS CONSTANTS PRACTICE, use structs for really basic, simple stuff 

#include <iostream>
#include <string>
using namespace std;


struct Constants {
	const double g = 9.81;
	const double c = 299792458;

} constants; // these are the objects.

int main() {


	cout << constants.g << endl;
	cout << constants.c << endl;

	return 0;
}



// Classes with Prototypes and Functions 
#include <iostream>
#include<string>
using namespace std;


class Rectangle {
	//this is private by default
	int width, height;

public: //you need this bcuz its not default

		//constructor prototype
	Rectangle(int, int);          // This calls the function Rectangle()

								  /*
								  Rectangle(int w, int h){           //I could also just do this
								  width=w;
								  height=h;
								  */


	int area(); //prototype

};


Rectangle::Rectangle(int w, int h) {
	width = w;
	height = h;
}

int Rectangle::area() { return width * height; }

int main() {
	| ->Class | ->Object
		Rectangle rect(3, 4);
	Rectangle rect2(5, 6);
	cout << "rect area= " << rect.area()
		<< " rectb area= " << rect2.area() << endl;

	return 0;
}