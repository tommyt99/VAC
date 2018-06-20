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