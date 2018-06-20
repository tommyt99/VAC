#include <iostream>
using namespace std;

// take 123 and reverse to 321 
int reverse(int n) {

	int result = 0;
	int right_digit;

	while (n != 0) {
		right_digit = n % 10;
		n /= 10;
		result = result * 10 + right_digit;

	}
	return  result;
}


int main() {
	int n = 0;
	cout << "Enter number to be flipped." << endl; 
	cin >> n;

	printf("%d reversed = %d", n, reverse(n));

	int o;
	cin >> o; 

	return 0;
}
