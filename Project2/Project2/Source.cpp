#include <iostream>
using namespace std;

int main() {
	int numbers[20] = { 1,2,3 };
	//int number[ 100 ] = {1,2,3, [10] = 10, 11, 12, [60] = 50, [42] = 420 };
	numbers[10] = 21;
	for (int i = 0; i < 20; ++i) {
		cout << numbers[i];
	}

	int o;

	cin >>  o; 
	return 0;
}

