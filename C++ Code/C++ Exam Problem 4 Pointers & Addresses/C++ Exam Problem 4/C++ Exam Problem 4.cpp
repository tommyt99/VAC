#include <iostream>
#include <cmath>
#include <array>
using namespace std;

int main() {
	int a = 1;
	int b = 2; 
	int *ptrA = &a;
	int *ptrB = &b;
	cout << "The address of a is: " << ptrA << endl << "The value of a is: " << *ptrA << endl;
	cout << "The address of b is: " << ptrB << endl << "The value of b is: " << *ptrB << endl;

	int o; cin >> o; //This is for you to see the output

	return 0;
}