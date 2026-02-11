import { Feather } from "@expo/vector-icons";

export const icon = {
    Reader: (props: any) => <Feather name='home' size={24} {...props} />,
    Database: (props: any) => <Feather name='database' size={24} {...props} />,
    Import: (props: any) => <Feather name='download' size={24} {...props} />,
    Export: (props: any) => <Feather name='share' size={24} {...props} />
}