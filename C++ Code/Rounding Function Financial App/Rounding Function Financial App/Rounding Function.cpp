#include <iostream>
#include <cmath>
#include <iomanip>
using namespace std;

int Roundup(float d, int n ) {
	float chopped = d * pow(10, n);
	float roundup = ceil(chopped);
	roundup /= pow(10, n);
	float generalround = round(chopped);
	generalround /= pow(10, n);
	// Returns error 
	return abs((roundup - generalround) / generalround);
}

int Rounddown(float d, int n ) {
	float chopped = d * pow(10, n);
	float rounddown = floor(chopped);
	rounddown /= pow(10, n); 
	float generalround = round(chopped);
	generalround /= pow(10, n);
	// Return error from rounding down 
	return abs((rounddown - generalround) / generalround);
}


int main() {
	cout << "Enter amount of money to round: " << endl;
	float d;
	cin >> d;
	cout << "The dough entered is: " << fixed << d << endl;
	cout << "Enter the number of decimal places you want to round to: " << endl;
	int n;
	cin >> n; 
	cout << "You want to round to " << n << " decimal places." << endl;
	
	float	errorRoundup =  Roundup(d,n);
	float errorRounddown = Rounddown(d, n);
	cout << "The error from rounding up is: " << fixed << errorRoundup << endl;
	cout << "The error from rounding down is: " << fixed << errorRounddown << endl;

	int o;
		cin >> o; 
	return 0; 
}


/*
0.1036x + 0.2122y = 0.7381 
0.2081x + 0.4247y = 0.9327
*/