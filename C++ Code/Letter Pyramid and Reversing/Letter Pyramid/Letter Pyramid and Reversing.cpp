#include <iostream>
#include <string>
using namespace std;

int main() {
	string alpha = "ABCDEDCBA";
	string space = "         ";
	string asterick = "*********"
		int spacenum = 4;



	for (int i = 0; i < 5; i++) {
		cout << space.substr(0, spacenum) << alpha.substr(0, i + 1) << alpha.substr(9 - i, 9) << endl;
		spacenum--;
	}

	spacenum = 4;
	for (int i = 0; i < 9; i += 2) {
		coout << spaces.substr(0, spacenum) << asterick.substr
	}




	//this is to display
	int j;
	cin >> j;


	return 0;
}


//This is reversing a string by printing it backwards with for loop.
#include <iostream>
#include <cmath>
#include <string>
#include <array>
using namespace std;

int main() {

	string a;
	cin >> a;
	int i;
	//int d = a.length();

	for (i = a.length(); i>-1; i--)
		cout << a[i];



	return 0;
}


// Palindrome checker
#include <iostream>
#include<string>

using namespace std;

int main() {
	// your code goes here
	string name;
	getline(cin, name);
	cout << "Original word: " << name << endl;
	cout << "Length: " << name.length() << endl;
	string reverse;

	for (int i = name.length() - 1; i>-1; i--) {
		reverse.push_back(name[i]);
	}

	cout << "Flipped word: " << reverse << endl;
	cout << "Length(reverse): " << reverse.length() << endl;

	if (reverse == name) {
		cout << "This is a palindrome!" << endl;
	}
	else {
		cout << "This is not a palindrome, sorry." << endl;
	}


	return 0;
}

